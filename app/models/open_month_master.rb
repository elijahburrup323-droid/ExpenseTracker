class OpenMonthMaster < ApplicationRecord
  belongs_to :user
  belongs_to :locked_by_user, class_name: "User", optional: true

  validates :current_year, presence: true, numericality: { only_integer: true, greater_than: 2000 }
  validates :current_month, presence: true, numericality: { only_integer: true, in: 1..12 }
  validates :user_id, uniqueness: true

  def self.for_user(user)
    find_or_create_by!(user: user) do |record|
      now = Time.current
      record.current_year = now.year
      record.current_month = now.month
    end
  end

  # Section 2: Flip has_data flag on first qualifying data event
  def mark_has_data!(source_label)
    return if has_data
    update!(
      has_data: true,
      first_data_at: Time.current,
      first_data_source: source_label
    )
  end

  # Soft close: snapshot the month, record the close, and advance to next month.
  # This is the ONLY allowed writer for snapshot tables and close_month_master.
  # Write-on-soft-close only. Do not call from CRUD or dashboard logic.
  def soft_close!(closing_user)
    raise "Month is already closed" if is_closed

    closing_year = current_year
    closing_month = current_month

    ActiveRecord::Base.transaction do
      generate_snapshots!

      next_month = current_month + 1
      next_year = current_year
      if next_month > 12
        next_month = 1
        next_year += 1
      end

      update!(
        is_closed: false,
        locked_at: Time.current,
        locked_by_user_id: closing_user.id,
        current_year: next_year,
        current_month: next_month,
        has_data: false,
        first_data_at: nil,
        first_data_source: nil
      )

      # Write-on-soft-close only. Do not call from CRUD or dashboard logic.
      CloseMonthMaster.find_or_initialize_by(
        user_id: user_id,
        closed_year: closing_year,
        closed_month: closing_month
      ).update!(
        closed_at: Time.current,
        closed_by_user_id: closing_user.id
      )
    end
  end

  # Section 3 & 4: Reopen previous month
  def reopen_previous_month!(reopening_user)
    raise "REOPEN_BLOCKED_NEW_MONTH_HAS_DATA" if has_data

    prev_month = current_month - 1
    prev_year = current_year
    if prev_month < 1
      prev_month = 12
      prev_year -= 1
    end

    ActiveRecord::Base.transaction do
      # Mark snapshots for previous month as stale (Option A from spec)
      AccountMonthSnapshot.where(user_id: user_id, year: prev_year, month: prev_month)
                          .update_all(is_stale: true)
      DashboardMonthSnapshot.where(user_id: user_id, year: prev_year, month: prev_month)
                            .update_all(is_stale: true)

      # Move open month pointer back
      update!(
        current_year: prev_year,
        current_month: prev_month,
        is_closed: false,
        has_data: true, # Previous month had data (that's why it was closed)
        first_data_at: nil,
        first_data_source: nil,
        reopen_count: reopen_count + 1,
        last_reopened_at: Time.current,
        last_reopened_by_user_id: reopening_user.id
      )
    end
  end

  private

  # Write-on-soft-close only. Do not call from CRUD or dashboard logic.
  # This method is private — only callable via soft_close! above.
  def generate_snapshots!
    year = current_year
    month = current_month
    month_start = Date.new(year, month, 1)
    month_end = month_start.end_of_month

    # Per-account snapshots
    user.accounts.each do |account|
      AccountMonthSnapshot.find_or_initialize_by(
        user_id: user_id, year: year, month: month, account_id: account.id
      ).update!(
        beginning_balance: account.beginning_balance,
        ending_balance: account.balance,
        is_stale: false
      )
    end

    # Dashboard aggregated snapshot
    budget_accounts = user.accounts.where(include_in_budget: true)
    month_txns = user.transactions.where(txn_date: month_start..month_end)
    total_spent = month_txns.payments.sum(:amount)
    total_income = month_txns.deposits.sum(:amount)
    credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
    debit_budget = budget_accounts.where.not(account_type_master_id: credit_ids)
    beg_bal = debit_budget.sum(:beginning_balance)
    end_bal = debit_budget.sum(:balance)
    nw = Account.net_worth_for(user.accounts, user: user)[:net_worth]

    DashboardMonthSnapshot.find_or_initialize_by(
      user_id: user_id, year: year, month: month
    ).update!(
      total_spent: total_spent,
      total_income: total_income,
      beginning_balance: beg_bal,
      ending_balance: end_bal,
      net_worth: nw,
      is_stale: false
    )

    # Net worth snapshot for chart history
    NetWorthSnapshot.find_or_initialize_by(
      user_id: user_id, snapshot_date: month_end
    ).update!(amount: nw)
  end
end
