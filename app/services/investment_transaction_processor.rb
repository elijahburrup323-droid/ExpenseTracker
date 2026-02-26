class InvestmentTransactionProcessor
  # Processes an investment transaction: creates/consumes lots, updates holding aggregates.
  # Called after a transaction is persisted.
  #
  # Returns { success: true } or raises on failure.
  def self.process!(transaction)
    case transaction.transaction_type
    when "BUY", "REINVEST"
      process_buy!(transaction)
    when "SELL"
      process_sell!(transaction)
    when "DIVIDEND", "FEE"
      # No lot or share changes — these are recorded as-is
      nil
    when "SPLIT"
      # Stock splits handled separately (no lot changes in this CM)
      nil
    end

    { success: true }
  end

  # Reverses a transaction's effects (for soft-delete or edit).
  # Must be called BEFORE the transaction is removed.
  def self.reverse!(transaction)
    case transaction.transaction_type
    when "BUY", "REINVEST"
      reverse_buy!(transaction)
    when "SELL"
      reverse_sell!(transaction)
    end
  end

  private

  # BUY / REINVEST: Create an OPEN lot, increase holding shares + cost basis.
  def self.process_buy!(txn)
    holding = txn.investment_holding

    lot = InvestmentLot.create!(
      user_id: txn.user_id,
      investment_holding_id: holding.id,
      buy_transaction_id: txn.id,
      acquired_date: txn.transaction_date,
      shares_acquired: txn.shares,
      shares_remaining: txn.shares,
      cost_per_share: txn.price_per_share,
      cost_basis: (txn.shares * txn.price_per_share).round(2),
      status: "OPEN"
    )

    holding.update!(
      shares_held: holding.shares_held + txn.shares,
      cost_basis_total: holding.cost_basis_total + lot.cost_basis
    )
  end

  # SELL (FIFO): Consume oldest lots, calculate realized gain, update holding.
  def self.process_sell!(txn)
    holding = txn.investment_holding
    remaining = txn.shares
    total_cost = BigDecimal("0")

    holding.investment_lots
           .open_lots
           .where("acquired_date <= ?", txn.transaction_date)
           .fifo_order
           .each do |lot|
      break if remaining <= 0

      consumed = lot.consume_shares!(remaining)
      lot.update!(sell_transaction_id: txn.id) if lot.status == "CLOSED"
      total_cost += lot.cost_basis_for_shares(consumed)
      remaining -= consumed
    end

    realized_gain = (txn.total_amount - total_cost).round(2)
    txn.update_columns(realized_gain: realized_gain)

    holding.update!(
      shares_held: holding.shares_held - txn.shares,
      cost_basis_total: (holding.cost_basis_total - total_cost).round(2)
    )
  end

  # Reverse a BUY/REINVEST: remove the lot, decrease holding aggregates.
  def self.reverse_buy!(txn)
    holding = txn.investment_holding
    lot = InvestmentLot.find_by(buy_transaction_id: txn.id)
    return unless lot

    holding.update!(
      shares_held: holding.shares_held - lot.shares_remaining,
      cost_basis_total: (holding.cost_basis_total - (lot.shares_remaining * lot.cost_per_share)).round(2)
    )
    lot.destroy!
  end

  # Reverse a SELL: reopen consumed lots, recalculate holding aggregates.
  def self.reverse_sell!(txn)
    holding = txn.investment_holding

    # Reopen lots that were consumed by this sell
    InvestmentLot.where(sell_transaction_id: txn.id).find_each do |lot|
      lot.update!(
        sell_transaction_id: nil,
        shares_remaining: lot.shares_acquired,
        status: "OPEN"
      )
    end

    # Recalculate holding from lots
    holding.recalculate_from_lots!
  end

  private_class_method :process_buy!, :process_sell!, :reverse_buy!, :reverse_sell!
end
