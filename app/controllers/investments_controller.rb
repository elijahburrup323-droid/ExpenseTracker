class InvestmentsController < ApplicationController
  before_action :authenticate_user!

  def index
    nw_accounts = current_user.investment_accounts.active.included_in_net_worth
      .includes(:investment_holdings)

    @total_portfolio_value = nw_accounts.sum { |a| a.total_market_value }
    @total_cost_basis = nw_accounts.sum { |a| a.total_cost_basis }
    @total_unrealized_gain = @total_portfolio_value - @total_cost_basis
    @total_realized_gain = current_user.investment_transactions.sells.sum(:realized_gain).to_d

    @account_summaries = current_user.investment_accounts.active.ordered
      .includes(:investment_holdings).map do |acct|
      mv = acct.total_market_value
      cb = acct.total_cost_basis
      ug = mv - cb
      pct = cb.zero? ? BigDecimal("0") : ((ug / cb) * 100).round(1)
      {
        id: acct.id,
        name: acct.name,
        account_type: acct.account_type,
        market_value: mv,
        cost_basis: cb,
        unrealized_gain: ug,
        gain_pct: pct,
        include_in_net_worth: acct.include_in_net_worth
      }
    end
  end

  def accounts
  end

  def holdings
    @account = current_user.investment_accounts.active.find_by(id: params[:id])
    redirect_to investments_path, alert: "Account not found" unless @account
  end

  def holding_detail
    @holding = current_user.investment_holdings.find_by(id: params[:id])
    redirect_to investments_path, alert: "Holding not found" unless @holding
  end
end
