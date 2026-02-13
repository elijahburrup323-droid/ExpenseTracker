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
      # Server-side month control: effective_date must be in current open month
      open_month = OpenMonthMaster.for_user(current_user)
      effective_date = params[:account][:effective_date].presence
      if effective_date.present?
        begin
          ed = Date.parse(effective_date)
        rescue ArgumentError
          ed = nil
        end
        if ed && (ed.year != open_month.current_year || ed.month != open_month.current_month)
          month_name = Date::MONTHNAMES[open_month.current_month]
          Rails.logger.info("[ACCOUNT CREATE BLOCKED] user=#{current_user.id} attempted_date=#{effective_date} open_month=#{open_month.current_year}-#{open_month.current_month}")
          return render json: { errors: ["You can only add accounts dated within your open month (#{month_name} #{open_month.current_year}). Change the date or change your open month."] }, status: :conflict
        end
      end

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
      has_deposits = @account.income_entries.exists?
      has_payments = @account.payments.exists?

      if has_deposits || has_payments
        return render json: {
          blocked: true,
          has_deposits: has_deposits,
          has_payments: has_payments
        }, status: :conflict
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
