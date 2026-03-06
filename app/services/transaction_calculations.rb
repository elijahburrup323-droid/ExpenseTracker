class TransactionCalculations
  attr_reader :user

  def initialize(user)
    @user = user
  end

  # ── Monthly Totals ────────────────────────────────────────

  def monthly_spent(year, month)
    month_scope(year, month).payments.sum(:amount)
  end

  def monthly_income(year, month)
    month_scope(year, month).deposits.sum(:amount)
  end

  def monthly_transfers(year, month)
    month_scope(year, month).transfers.sum(:amount)
  end

  # ── Spending Breakdowns ───────────────────────────────────

  def spending_by_category(year, month)
    month_scope(year, month).payments
      .joins("INNER JOIN spending_categories ON spending_categories.id = transactions.spending_category_id")
      .group("spending_categories.id", "spending_categories.name")
      .sum(:amount)
  end

  def spending_by_type(year, month)
    month_scope(year, month).payments
      .joins("INNER JOIN spending_categories ON spending_categories.id = transactions.spending_category_id")
      .joins("INNER JOIN spending_types ON spending_types.id = spending_categories.spending_type_id")
      .group("spending_types.id", "spending_types.name")
      .sum(:amount)
  end

  # ── Date Range Queries ────────────────────────────────────

  def payments_in_range(start_date, end_date)
    user.transactions.payments.where(txn_date: start_date..end_date).ordered
  end

  def deposits_in_range(start_date, end_date)
    user.transactions.deposits.where(txn_date: start_date..end_date).ordered
  end

  def transfers_in_range(start_date, end_date)
    user.transactions.transfers.where(txn_date: start_date..end_date).ordered
  end

  # ── Account Scoped ────────────────────────────────────────

  def account_payments(account_id, start_date: nil, end_date: nil)
    scope = user.transactions.payments.where(account_id: account_id)
    scope = scope.where(txn_date: start_date..end_date) if start_date && end_date
    scope
  end

  def account_deposits(account_id, start_date: nil, end_date: nil)
    scope = user.transactions.deposits.where(account_id: account_id)
    scope = scope.where(txn_date: start_date..end_date) if start_date && end_date
    scope
  end

  # ── Reconciliation ────────────────────────────────────────

  def reconciled_payments_total(account_id)
    user.transactions.payments.where(account_id: account_id, reconciled: true).sum(:amount)
  end

  def unreconciled_payments(account_id)
    user.transactions.payments.where(account_id: account_id, reconciled: false).ordered
  end

  def unreconciled_deposits(account_id)
    user.transactions.deposits.where(account_id: account_id, reconciled: false).ordered
  end

  # ── Recent Activity ───────────────────────────────────────

  def recent_activity(limit: 20)
    user.transactions.where(txn_type: %w[payment deposit]).ordered.limit(limit)
  end

  private

  def month_scope(year, month)
    user.transactions.for_month(year, month)
  end
end
