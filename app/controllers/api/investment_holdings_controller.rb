module Api
  class InvestmentHoldingsController < BaseController
    before_action :set_holding, only: [:show, :update]

    # GET /api/investment_holdings?investment_account_id=X
    def index
      account = current_user.investment_accounts.active.find_by(id: params[:investment_account_id])
      return render_not_found unless account

      holdings = account.investment_holdings.active.ordered.with_computed_values
      render json: holdings.map { |h| holding_summary_json(h) }
    end

    # GET /api/investment_holdings/:id
    def show
      transactions = @holding.investment_transactions.by_date.recent(500)
      render json: holding_detail_json(@holding, transactions)
    end

    # PUT /api/investment_holdings/:id  (notes only for CM-9)
    def update
      if @holding.update(holding_params)
        render json: holding_detail_json(@holding, @holding.investment_transactions.by_date.recent(500))
      else
        render_errors(@holding)
      end
    end

    private

    def set_holding
      @holding = current_user.investment_holdings.find_by(id: params[:id])
      render_not_found unless @holding
    end

    def holding_params
      params.require(:investment_holding).permit(:notes)
    end

    def holding_summary_json(h)
      mv = (h.respond_to?(:computed_market_value) ? h.computed_market_value : h.market_value).to_f.round(2)
      cb = h.cost_basis_total.to_f.round(2)
      ug = (mv - cb).round(2)
      pct = cb.zero? ? 0.0 : ((ug / cb) * 100).round(2)
      {
        id: h.id,
        ticker_symbol: h.ticker_symbol,
        security_name: h.security_name,
        security_type: h.security_type,
        shares_held: h.shares_held.to_f,
        current_price: h.current_price&.to_f,
        market_value: mv,
        cost_basis: cb,
        unrealized_gain: ug,
        gain_pct: pct,
        include_in_net_worth: h.include_in_net_worth
      }
    end

    def holding_detail_json(h, transactions)
      mv = h.market_value.to_f.round(2)
      cb = h.cost_basis_total.to_f.round(2)
      {
        id: h.id,
        investment_account_id: h.investment_account_id,
        ticker_symbol: h.ticker_symbol,
        security_name: h.security_name,
        security_type: h.security_type,
        shares_held: h.shares_held.to_f,
        current_price: h.current_price&.to_f,
        price_as_of: h.price_as_of,
        market_value: mv,
        cost_basis: cb,
        unrealized_gain: (mv - cb).round(2),
        include_in_net_worth: h.include_in_net_worth,
        notes: h.notes,
        transactions: transactions.map { |t| transaction_json(t) }
      }
    end

    def transaction_json(t)
      {
        id: t.id,
        transaction_type: t.transaction_type,
        transaction_date: t.transaction_date,
        shares: t.shares&.to_f,
        price_per_share: t.price_per_share&.to_f,
        total_amount: t.total_amount.to_f,
        fees: t.fees.to_f,
        realized_gain: t.realized_gain&.to_f,
        notes: t.notes
      }
    end
  end
end
