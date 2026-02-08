module Api
  class AccountsController < BaseController
    before_action :set_account, only: [:update, :destroy]

    def index
      accounts = current_user.accounts.ordered.includes(:account_type)
      render json: accounts.map { |a|
        a.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: a.account_type_id, account_type_name: a.account_type.name, account_type_description: a.account_type.description)
      }
    end

    def create
      max_sort = current_user.accounts.maximum(:sort_order) || 0
      account = current_user.accounts.build(account_params)
      account.sort_order = max_sort + 1
      account.beginning_balance = account.balance

      if account.save
        account_type = account.account_type
        render json: account.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: account.account_type_id, account_type_name: account_type.name, account_type_description: account_type.description), status: :created
      else
        render_errors(account)
      end
    end

    def update
      if @account.beginning_balance.to_f == 0 && account_params[:balance].present?
        @account.beginning_balance = account_params[:balance]
      end
      if @account.update(account_params)
        account_type = @account.account_type
        render json: @account.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: @account.account_type_id, account_type_name: account_type.name, account_type_description: account_type.description)
      else
        render_errors(@account)
      end
    end

    def destroy
      if @account.payments.exists?
        return render json: { errors: ["This account cannot be deleted because payments are associated with it. Please reassign or remove those payments before deleting the account."] }, status: :unprocessable_entity
      end
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
