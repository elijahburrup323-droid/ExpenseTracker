module Api
  class AccountsController < BaseController
    before_action :set_account, only: [:update, :destroy]

    def index
      accounts = current_user.accounts.ordered.includes(:account_type)
      render json: accounts.map { |a|
        a.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: a.account_type_id, account_type_name: a.account_type.name)
      }
    end

    def create
      max_sort = current_user.accounts.maximum(:sort_order) || 0
      account = current_user.accounts.build(account_params)
      account.sort_order = max_sort + 1

      if account.save
        account_type = account.account_type
        render json: account.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: account.account_type_id, account_type_name: account_type.name), status: :created
      else
        render_errors(account)
      end
    end

    def update
      if @account.update(account_params)
        account_type = @account.account_type
        render json: @account.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: @account.account_type_id, account_type_name: account_type.name)
      else
        render_errors(@account)
      end
    end

    def destroy
      @account.soft_delete!
      head :no_content
    end

    private

    def set_account
      @account = current_user.accounts.find_by(id: params[:id])
      render_not_found unless @account
    end

    def account_params
      params.require(:account).permit(:name, :account_type_id, :institution, :balance, :include_in_budget, :icon_key, :color_key)
    end
  end
end
