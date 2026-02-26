module RecalculationAuditable
  extend ActiveSupport::Concern

  class_methods do
    # Log a FIFO recalculation event on an InvestmentHolding.
    # Called when a historical investment transaction is edited or deleted,
    # triggering recalculation of cost basis and realized gains.
    def log_fifo_recalculation!(user_id:, holding:, trigger_transaction_id:,
                                recalculation_start_date:, affected_count:,
                                before_realized_gain_total:, after_realized_gain_total:)
      AuditLog.log!(
        user_id: user_id,
        entity_type: "InvestmentHolding",
        entity_id: holding.id,
        action_type: "RECALCULATION",
        before_json: {
          realized_gain_total: before_realized_gain_total.to_s("F")
        },
        after_json: {
          realized_gain_total: after_realized_gain_total.to_s("F")
        },
        metadata: {
          recalculation_type: "FIFO",
          trigger_transaction_id: trigger_transaction_id,
          recalculation_start_date: recalculation_start_date.to_s,
          affected_transactions_count: affected_count,
          holding_security_name: holding.security_name,
          holding_ticker: holding.ticker_symbol
        }
      )
    end

    # Log an amortization recalculation event on a FinancingInstrument.
    # Called when a historical payment edit triggers forward amortization recalculation.
    def log_amortization_recalculation!(user_id:, instrument:, payment_edit_id:,
                                        recalculation_start_period:,
                                        old_payoff_date:, new_payoff_date:,
                                        old_interest_total:, new_interest_total:)
      AuditLog.log!(
        user_id: user_id,
        entity_type: "FinancingInstrument",
        entity_id: instrument.id,
        action_type: "RECALCULATION",
        before_json: {
          payoff_date: old_payoff_date&.to_s,
          interest_total: old_interest_total.to_s("F")
        },
        after_json: {
          payoff_date: new_payoff_date&.to_s,
          interest_total: new_interest_total.to_s("F")
        },
        metadata: {
          recalculation_type: "AMORTIZATION",
          payment_edit_id: payment_edit_id,
          recalculation_start_period: recalculation_start_period,
          instrument_name: instrument.name,
          instrument_type: instrument.instrument_type
        }
      )
    end
  end
end
