module Api
  class AccountTypesController < BaseController
    before_action :set_account_type, only: [:update, :destroy]

    def index
      account_types = current_user.account_types.ordered
      render json: account_types.as_json(only: [:id, :name, :description, :icon_key, :color_key, :sort_order, :is_system, :is_active])
    end

    def create
      max_sort = current_user.account_types.maximum(:sort_order) || 0
      account_type = current_user.account_types.build(account_type_params)
      account_type.sort_order = max_sort + 1

      if account_type.save
        render json: account_type.as_json(only: [:id, :name, :description, :icon_key, :color_key, :sort_order, :is_system, :is_active]), status: :created
      else
        render_errors(account_type)
      end
    end

    def update
      if @account_type.update(account_type_params)
        render json: @account_type.as_json(only: [:id, :name, :description, :icon_key, :color_key, :sort_order, :is_system, :is_active])
      else
        render_errors(@account_type)
      end
    end

    def destroy
      @account_type.soft_delete!
      head :no_content
    end

    private

    def set_account_type
      @account_type = current_user.account_types.find_by(id: params[:id])
      render_not_found unless @account_type
    end

    def account_type_params
      params.require(:account_type).permit(:name, :description, :icon_key, :color_key)
    end
  end
end
