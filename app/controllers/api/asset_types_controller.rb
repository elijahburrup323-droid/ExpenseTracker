module Api
  class AssetTypesController < BaseController
    before_action :set_asset_type, only: [:update, :destroy]

    def index
      # Return system types + user's custom types
      system_types = AssetType.system_types.ordered
      custom_types = current_user.asset_types.ordered
      all_types = (system_types + custom_types).sort_by { |t| [t.sort_order, t.name] }

      render json: all_types.map { |t| asset_type_json(t) }
    end

    def create
      max_sort = current_user.asset_types.maximum(:sort_order) || 0
      asset_type = current_user.asset_types.build(asset_type_params)
      asset_type.sort_order = max_sort + 1

      if asset_type.save
        render json: asset_type_json(asset_type), status: :created
      else
        render_errors(asset_type)
      end
    end

    def update
      unless @asset_type.custom?
        return render json: { errors: ["System asset types cannot be modified"] }, status: :unprocessable_entity
      end

      if @asset_type.update(asset_type_params)
        render json: asset_type_json(@asset_type)
      else
        render_errors(@asset_type)
      end
    end

    def destroy
      unless @asset_type.custom?
        return render json: { errors: ["System asset types cannot be deleted"] }, status: :unprocessable_entity
      end

      if @asset_type.in_use?
        return render json: { errors: ["Cannot delete: assets use this type"] }, status: :unprocessable_entity
      end

      @asset_type.soft_delete!
      head :no_content
    end

    private

    def set_asset_type
      # Allow finding system types (user_id nil) or user's custom types
      @asset_type = AssetType.find_by(id: params[:id])
      render_not_found unless @asset_type
    end

    def asset_type_params
      params.require(:asset_type).permit(:name, :description, :icon_key, :is_active)
    end

    def asset_type_json(t)
      t.as_json(only: [:id, :name, :description, :icon_key, :is_active, :sort_order])
        .merge(
          is_system: !t.custom?,
          in_use: t.in_use?
        )
    end
  end
end
