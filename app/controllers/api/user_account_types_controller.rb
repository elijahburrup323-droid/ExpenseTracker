module Api
  class UserAccountTypesController < BaseController
    def index
      # Return ALL active master types overlaid with user's is_enabled flag
      user_map = current_user.user_account_types.index_by(&:account_type_master_id)
      masters = AccountTypeMaster.where(is_active: true).order(:sort_order, :display_name)
      render json: masters.map { |m|
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
          sort_order: m.sort_order
        }
      }
    end

    def update
      master_id = params[:id]
      master = AccountTypeMaster.find_by(id: master_id)
      return render_not_found unless master

      uat = current_user.user_account_types.find_or_initialize_by(account_type_master_id: master.id)

      if params.dig(:user_account_type, :is_enabled) != nil
        uat.is_enabled = params.dig(:user_account_type, :is_enabled)
      end

      if params[:user_account_type].key?(:custom_description)
        uat.custom_description = params.dig(:user_account_type, :custom_description)
      end

      if uat.save
        render json: {
          id: uat.id,
          account_type_master_id: master.id,
          display_name: master.display_name,
          master_description: master.description,
          custom_description: uat.custom_description,
          description: uat.custom_description.presence || master.description,
          is_enabled: uat.is_enabled
        }
      else
        render json: { errors: uat.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end
