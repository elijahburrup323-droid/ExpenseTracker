module Api
  class InvestmentAccountsController < BaseController
    include FeatureGate
    before_action -> { require_feature!("investments") }
    before_action :set_investment_account, only: [:show, :update, :destroy]

    def index
      accounts = current_user.investment_accounts.active.ordered
        .includes(:investment_holdings)
      render json: accounts.map { |a| account_json(a) }
    end

    def show
      render json: account_json(@investment_account)
    end

    def create
      account = current_user.investment_accounts.build(account_params)

      if account.save
        render json: account_json(account), status: :created
      else
        render_errors(account)
      end
    end

    def update
      if @investment_account.update(account_params)
        render json: account_json(@investment_account)
      else
        render_errors(@investment_account)
      end
    end

    def destroy
      @investment_account.update!(active: false)
      head :no_content
    end

    private

    def set_investment_account
      @investment_account = current_user.investment_accounts.active.find_by(id: params[:id])
      render_not_found unless @investment_account
    end

    def account_params
      params.require(:investment_account).permit(:name, :account_type, :include_in_net_worth)
    end

    def account_json(a)
      mv = a.total_market_value.to_f.round(2)
      cb = a.total_cost_basis.to_f.round(2)
      {
        id: a.id,
        name: a.name,
        account_type: a.account_type,
        include_in_net_worth: a.include_in_net_worth,
        market_value: mv,
        cost_basis: cb,
        unrealized_gain: (mv - cb).round(2)
      }
    end
  end
end
