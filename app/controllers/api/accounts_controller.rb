module Api
  class AccountsController < BaseController
    before_action :set_account, only: [:update, :destroy]

    def index
      accounts = current_user.accounts.ordered.includes(:account_type, :account_type_master)
      render json: accounts.map { |a|
        master = a.account_type_master
        type_name = master&.display_name || a.account_type&.name || ""
        type_desc = master&.description || a.account_type&.description || ""
        a.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: a.account_type_id, account_type_master_id: a.account_type_master_id, account_type_name: type_name, account_type_description: type_desc)
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

      # Auto-resolve account_type from account_type_master for backward compatibility
      resolve_account_type(account)

      if account.save
        master = account.account_type_master
        account_type = account.account_type
        type_name = master&.display_name || account_type&.name || ""
        type_desc = master&.description || account_type&.description || ""
        render json: account.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: account.account_type_id, account_type_master_id: account.account_type_master_id, account_type_name: type_name, account_type_description: type_desc), status: :created
      else
        render_errors(account)
      end
    end

    def update
      if @account.beginning_balance.to_f == 0 && account_params[:balance].present?
        @account.beginning_balance = account_params[:balance]
      end
      @account.assign_attributes(account_params)
      resolve_account_type(@account)
      if @account.save
        master = @account.account_type_master
        account_type = @account.account_type
        type_name = master&.display_name || account_type&.name || ""
        type_desc = master&.description || account_type&.description || ""
        render json: @account.as_json(only: [:id, :name, :institution, :balance, :include_in_budget, :icon_key, :color_key, :sort_order])
          .merge(account_type_id: @account.account_type_id, account_type_master_id: @account.account_type_master_id, account_type_name: type_name, account_type_description: type_desc)
      else
        render_errors(@account)
      end
    end

    def destroy
      has_deposits = @account.income_entries.exists?
      has_payments = @account.payments.exists?
      has_transfers = @account.transfers_from.exists? || @account.transfers_to.exists?

      if has_deposits || has_payments || has_transfers
        return render json: {
          blocked: true,
          has_deposits: has_deposits,
          has_payments: has_payments,
          has_transfers: has_transfers
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
      params.require(:account).permit(:name, :account_type_id, :account_type_master_id, :institution, :balance, :include_in_budget, :icon_key, :color_key)
    end

    def resolve_account_type(account)
      return if account.account_type_id.present?
      return unless account.account_type_master_id.present?

      master = AccountTypeMaster.find_by(id: account.account_type_master_id)
      return unless master

      # Find or create a legacy account_type record for this user matching the master
      legacy = current_user.account_types.unscoped
                 .where(user_id: current_user.id)
                 .find_by("LOWER(name) = ?", master.display_name.strip.downcase)
      unless legacy
        max_sort = current_user.account_types.unscoped.where(user_id: current_user.id).maximum(:sort_order) || 0
        legacy = current_user.account_types.create!(
          name: master.display_name,
          description: master.description || master.display_name,
          sort_order: max_sort + 1
        )
      end
      account.account_type_id = legacy.id
    end
  end
end
