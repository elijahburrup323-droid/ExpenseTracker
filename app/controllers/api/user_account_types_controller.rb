module Api
  class UserAccountTypesController < BaseController
    before_action :ensure_user_types_seeded, only: [:index]

    def index
      user_map = current_user.user_account_types.index_by(&:account_type_master_id)

      # System masters (active) + user's custom masters (not deleted)
      system_masters = AccountTypeMaster.system_types.active.ordered
      custom_masters = AccountTypeMaster.custom_for_user(current_user.id).active.ordered

      render json: (system_masters + custom_masters).map { |m|
        uat = user_map[m.id]
        {
          id: uat&.id,
          account_type_master_id: m.id,
          display_name: m.display_name,
          normalized_key: m.normalized_key,
          master_description: m.description,
          custom_description: uat&.custom_description,
          description: uat&.custom_description.presence || m.description,
          is_enabled: uat&.is_enabled || false,
          is_custom: m.custom?,
          sort_order: m.sort_order
        }
      }
    end

    def create
      name = params.dig(:user_account_type, :display_name)&.strip
      desc = params.dig(:user_account_type, :description)&.strip

      master = AccountTypeMaster.new(
        display_name: name,
        description: desc,
        owner_user_id: current_user.id,
        is_active: true,
        sort_order: (AccountTypeMaster.maximum(:sort_order) || 0) + 1
      )

      ActiveRecord::Base.transaction do
        if master.save
          uat = current_user.user_account_types.create!(
            account_type_master: master,
            is_enabled: true
          )
          render json: {
            id: uat.id,
            account_type_master_id: master.id,
            display_name: master.display_name,
            normalized_key: master.normalized_key,
            master_description: master.description,
            description: master.description,
            is_enabled: true,
            is_custom: true,
            sort_order: master.sort_order
          }, status: :created
        else
          render json: { errors: master.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end

    def update
      master = AccountTypeMaster.find_by(id: params[:id])
      return render_not_found unless master

      # Security: custom types can only be edited by their owner
      if master.custom? && master.owner_user_id != current_user.id
        return render_not_found
      end

      uat = current_user.user_account_types.find_or_initialize_by(account_type_master_id: master.id)

      if params.dig(:user_account_type, :is_enabled) != nil
        uat.is_enabled = params.dig(:user_account_type, :is_enabled)
      end

      if params[:user_account_type]&.key?(:custom_description)
        uat.custom_description = params.dig(:user_account_type, :custom_description)
      end

      # For custom types, allow editing display_name and description on the master
      if master.custom?
        if params[:user_account_type]&.key?(:display_name)
          master.display_name = params.dig(:user_account_type, :display_name)&.strip
          master.normalized_key = nil # trigger regeneration
        end
        if params[:user_account_type]&.key?(:description)
          master.description = params.dig(:user_account_type, :description)&.strip
        end
      end

      ActiveRecord::Base.transaction do
        master.save! if master.changed?
        uat.save!
      end

      render json: {
        id: uat.id,
        account_type_master_id: master.id,
        display_name: master.display_name,
        normalized_key: master.normalized_key,
        master_description: master.description,
        custom_description: uat.custom_description,
        description: uat.custom_description.presence || master.description,
        is_enabled: uat.is_enabled,
        is_custom: master.custom?
      }
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    def destroy
      master = AccountTypeMaster.find_by(id: params[:id])
      return render_not_found unless master

      unless master.custom? && master.owner_user_id == current_user.id
        return render json: { errors: ["System types cannot be deleted"] }, status: :forbidden
      end

      if master.in_use?
        return render json: {
          errors: ["This type is in use by one or more accounts. Remove or reassign those accounts first."],
          blocked: true
        }, status: :conflict
      end

      master.soft_delete!
      head :no_content
    end

    private

    def ensure_user_types_seeded
      system_count = AccountTypeMaster.system_types.count
      AccountTypeMaster.ensure_system_types! if system_count < AccountTypeMaster::CANONICAL_TYPES.size
      if current_user.user_account_types.count < AccountTypeMaster.system_types.active.count
        AccountTypeMaster.seed_defaults_for_user(current_user)
      end
    end
  end
end
