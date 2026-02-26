class FifoRecalculationService
  # Recalculates FIFO cost basis and realized gains for a holding,
  # starting only from the affected transaction forward (bounded).
  #
  # Does NOT reprocess the entire transaction history — only transactions
  # on or after trigger_date are reprocessed.
  #
  # Returns { affected_count:, elapsed_seconds: }
  def self.recalculate_forward!(holding, trigger_transaction_id:, trigger_date:, user_id:)
    before_gain = holding.investment_transactions.sells.sum(:realized_gain).to_d

    result = RecalculationSafetyService.with_safety(entity: holding, user_id: user_id) do
      # Only process sell transactions on or after the trigger date
      affected_sells = holding.investment_transactions
                              .sells
                              .where("transaction_date >= ?", trigger_date)
                              .order(:transaction_date, :id)

      affected_count = 0

      affected_sells.find_each do |sell_txn|
        recalculate_sell_gains!(sell_txn, holding)
        affected_count += 1
      end

      # Recalculate holding aggregates from lots (forward-only)
      holding.recalculate_from_lots!(from_date: trigger_date)

      affected_count
    end

    after_gain = holding.investment_transactions.sells.sum(:realized_gain).to_d

    # Log the recalculation event
    RecalculationAuditable.log_fifo_recalculation!(
      user_id: user_id,
      holding: holding,
      trigger_transaction_id: trigger_transaction_id,
      recalculation_start_date: trigger_date,
      affected_count: result,
      before_realized_gain_total: before_gain,
      after_realized_gain_total: after_gain
    )

    { affected_count: result }
  end

  # Check if a holding exceeds the recommended transaction count.
  # Returns a warning hash if so, nil otherwise.
  def self.transaction_count_check(holding)
    count = holding.investment_transactions.count
    return nil unless count > InvestmentHolding::MAX_RECOMMENDED_TRANSACTIONS

    {
      holding_id: holding.id,
      security_name: holding.security_name,
      transaction_count: count,
      max_recommended: InvestmentHolding::MAX_RECOMMENDED_TRANSACTIONS,
      message: "#{holding.security_name} has #{count} transactions, " \
               "exceeding the recommended maximum of #{InvestmentHolding::MAX_RECOMMENDED_TRANSACTIONS}. " \
               "Performance may be affected."
    }
  end

  private

  # Recalculate realized gain for a single sell transaction using FIFO lots.
  def self.recalculate_sell_gains!(sell_txn, holding)
    # Clear existing lot assignments for this sell
    InvestmentLot.where(sell_transaction_id: sell_txn.id).update_all(
      sell_transaction_id: nil,
      status: "OPEN",
      shares_remaining: Arel.sql("shares_acquired")
    )

    # Re-assign lots in FIFO order
    remaining_to_sell = sell_txn.shares
    cost_basis = BigDecimal("0")

    holding.investment_lots
           .where(sell_transaction_id: nil)
           .where("acquired_date <= ?", sell_txn.transaction_date)
           .fifo_order
           .each do |lot|
      break if remaining_to_sell <= 0

      consumed = lot.consume_shares!(remaining_to_sell)
      lot.update!(sell_transaction_id: sell_txn.id) if lot.status == "CLOSED"
      cost_basis += lot.cost_basis_for_shares(consumed)
      remaining_to_sell -= consumed
    end

    sell_txn.update!(realized_gain: (sell_txn.total_amount - cost_basis).round(2))
  end

  private_class_method :recalculate_sell_gains!
end
