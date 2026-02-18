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
          description: m.description,
          is_enabled: uat&.is_enabled || false,
          sort_order: m.sort_order
        }
      }
    end

    def update
      is_enabled = params.dig(:user_account_type, :is_enabled)
      master_id = params[:id]

      master = AccountTypeMaster.find_by(id: master_id)
      return render_not_found unless master

      uat = current_user.user_account_types.find_or_initialize_by(account_type_master_id: master.id)
      uat.is_enabled = is_enabled

      if uat.save
        render json: {
          id: uat.id,
          account_type_master_id: master.id,
          display_name: master.display_name,
          is_enabled: uat.is_enabled
        }
      else
        render json: { errors: uat.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end
