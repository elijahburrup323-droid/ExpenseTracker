module Api
  class FeatureStoreController < BaseController
    def blocks
      blocks = FeatureBlock.ordered.includes(:dependencies, :dependents, :prerequisite_blocks, :dependent_blocks)
      active_ids = current_user.feature_activations.active.pluck(:feature_block_id).to_set
      suggestions = current_user.smart_suggestions.pending.pluck(:feature_block_id).to_set

      # Pre-build a block lookup for cascade computation
      all_blocks = blocks.to_a
      block_map = all_blocks.index_by(&:id)

      render json: all_blocks.map { |b|
        deps_met = b.prerequisite_blocks.all? { |dep| active_ids.include?(dep.id) }
        cascade_deps = collect_active_dependents(b, active_ids, block_map)

        {
          id: b.id,
          key: b.key,
          display_name: b.display_name,
          tagline: b.tagline,
          description: b.description,
          icon: b.icon,
          category: b.category,
          tier: b.tier,
          is_core: b.is_core,
          sort_order: b.sort_order,
          estimated_setup: b.estimated_setup,
          active: active_ids.include?(b.id),
          dependencies_met: deps_met,
          cascade_deactivate_names: cascade_deps.map(&:display_name),
          recommended: suggestions.include?(b.id),
          tutorial_data: b.tutorial_data,
          dependency_keys: b.prerequisite_blocks.map(&:key)
        }
      }
    end

    def activate
      block = FeatureBlock.find_by!(key: params[:key])

      # Auto-activate dependencies first
      deps_to_activate = collect_dependencies(block)
      all_blocks = [block] + deps_to_activate

      all_blocks.each do |b|
        activation = UserFeatureActivation.find_or_initialize_by(user_id: current_user.id, feature_block_id: b.id)
        activation.activated_at ||= Time.current
        activation.deactivated_at = nil
        activation.save!
      end

      # Resolve any matching suggestions
      current_user.smart_suggestions.pending.where(feature_block_id: block.id).update_all(status: "accepted")

      render json: { activated: all_blocks.map(&:key), activate_path: block.try(:activate_path) }
    end

    def deactivate
      block = FeatureBlock.find_by!(key: params[:key])

      if block.is_core
        return render json: { errors: ["Cannot deactivate core features."] }, status: :unprocessable_entity
      end

      # Cascade: collect all active dependents recursively and deactivate them too
      active_block_ids = current_user.feature_activations.active.pluck(:feature_block_id).to_set
      block_map = FeatureBlock.includes(:dependents, :dependent_blocks).index_by(&:id)
      cascade = collect_active_dependents(block, active_block_ids, block_map)
      all_to_deactivate = [block] + cascade

      ActiveRecord::Base.transaction do
        all_to_deactivate.each do |b|
          activation = current_user.feature_activations.find_by(feature_block_id: b.id)
          activation&.deactivate!
        end
      end

      render json: { deactivated: all_to_deactivate.map(&:key), deactivated_names: all_to_deactivate.map(&:display_name) }
    end

    private

    def collect_dependencies(block, collected = [])
      block.prerequisite_blocks.each do |dep|
        next if collected.include?(dep)
        collected << dep
        collect_dependencies(dep, collected)
      end
      collected
    end

    def collect_active_dependents(block, active_ids, block_map, collected = [])
      block.dependent_blocks.each do |dep|
        next unless active_ids.include?(dep.id)
        next if dep.is_core
        next if collected.include?(dep)
        collected << dep
        collect_active_dependents(dep, active_ids, block_map, collected)
      end
      collected
    end
  end
end
