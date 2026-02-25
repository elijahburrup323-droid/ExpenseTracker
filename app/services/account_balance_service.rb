class AccountBalanceService
  # Returns { account_id => computed_balance } for all non-deleted accounts
  # that existed by as_of_date, computed from beginning_balance + transactions.
  # All account types use the same arithmetic: deposits add, payments subtract,
  # transfers-in add, transfers-out subtract. No sign multiplier.
  def self.balances_as_of(user, as_of_date)
    accounts = user.accounts.where("accounts.created_at <= ?", as_of_date.end_of_day)
    balances = accounts.pluck(:id, :beginning_balance).to_h { |id, bb| [id, bb.to_f] }

    # Deposits (received only, with an account)
    user.income_entries
        .where("entry_date <= ?", as_of_date)
        .where(received_flag: true)
        .where.not(account_id: nil)
        .group(:account_id)
        .sum(:amount)
        .each { |aid, amt| balances[aid] = (balances[aid] || 0) + amt.to_f }

    # Payments
    user.payments
        .where("payment_date <= ?", as_of_date)
        .group(:account_id)
        .sum(:amount)
        .each { |aid, amt| balances[aid] = (balances[aid] || 0) - amt.to_f }

    # Transfers in (to_account_id)
    user.transfer_masters
        .where("transfer_date <= ?", as_of_date)
        .group(:to_account_id)
        .sum(:amount)
        .each { |aid, amt| balances[aid] = (balances[aid] || 0) + amt.to_f }

    # Transfers out (from_account_id)
    user.transfer_masters
        .where("transfer_date <= ?", as_of_date)
        .group(:from_account_id)
        .sum(:amount)
        .each { |aid, amt| balances[aid] = (balances[aid] || 0) - amt.to_f }

    # Balance adjustments (always additive — user controls the sign)
    user.balance_adjustments
        .where("adjustment_date <= ?", as_of_date)
        .group(:account_id)
        .sum(:amount)
        .each { |aid, amt| balances[aid] = (balances[aid] || 0) + amt.to_f }

    balances
  end
end
