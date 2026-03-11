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

      # NOTE: Do NOT roll forward account.beginning_balance here.
      # AccountBalanceService computes balance as: beginning_balance + ALL transactions.
      # Updating beginning_balance to current balance would double-count prior transactions.
      # Snapshot beginning_balance is computed correctly via AccountBalanceService.

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
    prev_month = current_month - 1
    prev_year = current_year
    if prev_month < 1
      prev_month = 12
      prev_year -= 1
    end

    ActiveRecord::Base.transaction do
      # Mark snapshots for previous month as stale
      AccountMonthSnapshot.where(user_id: user_id, year: prev_year, month: prev_month)
                          .update_all(is_stale: true)
      DashboardMonthSnapshot.where(user_id: user_id, year: prev_year, month: prev_month)
                            .update_all(is_stale: true)

      # Delete the close record (will be recreated on re-close)
      CloseMonthMaster.find_by(
        user_id: user_id, closed_year: prev_year, closed_month: prev_month
      )&.destroy

      # Move open month pointer back, store forwarded month
      update!(
        forwarded_year: current_year,
        forwarded_month: current_month,
        is_reopened: true,
        current_year: prev_year,
        current_month: prev_month,
        is_closed: false,
        has_data: true,
        first_data_at: nil,
        first_data_source: nil,
        reopen_count: reopen_count + 1,
        last_reopened_at: Time.current,
        last_reopened_by_user_id: reopening_user.id
      )
    end
  end

  # Re-close a reopened month: regenerate snapshots, cascade balances, advance pointer back
  def reclose_reopened_month!(closing_user)
    raise "Not in reopened state" unless is_reopened

    reopened_year = current_year
    reopened_month = current_month
    fwd_year = forwarded_year
    fwd_month = forwarded_month

    ActiveRecord::Base.transaction do
      # 1. Regenerate snapshots for the reopened month (overwrites stale records)
      generate_snapshots!

      # 2. Cascade beginning balances to the forwarded month
      # Per-account: forwarded month's beginning_balance = account's current balance
      user.accounts.each do |account|
        snap = AccountMonthSnapshot.find_or_initialize_by(
          user_id: user_id, year: fwd_year, month: fwd_month, account_id: account.id
        )
        snap.update!(
          beginning_balance: account.balance,
          is_stale: true
        )
      end

      # Dashboard snapshot for forwarded month: recalculate beginning_balance
      credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
      budget_accounts = user.accounts.where(include_in_budget: true)
      debit_budget = budget_accounts.where.not(account_type_master_id: credit_ids)
      fwd_beg_bal = debit_budget.sum(:balance)

      fwd_dash = DashboardMonthSnapshot.find_or_initialize_by(
        user_id: user_id, year: fwd_year, month: fwd_month
      )
      fwd_dash.update!(
        beginning_balance: fwd_beg_bal,
        is_stale: true
      )

      # 3. Update live account beginning_balance fields
      user.accounts.each do |account|
        account.update_column(:beginning_balance, account.balance)
      end

      # 4. Advance pointer back to forwarded month
      update!(
        current_year: fwd_year,
        current_month: fwd_month,
        is_reopened: false,
        forwarded_year: nil,
        forwarded_month: nil,
        is_closed: false,
        has_data: false,
        first_data_at: nil,
        first_data_source: nil
      )

      # 5. Recreate CloseMonthMaster for the reopened month
      CloseMonthMaster.find_or_initialize_by(
        user_id: user_id,
        closed_year: reopened_year,
        closed_month: reopened_month
      ).update!(
        closed_at: Time.current,
        closed_by_user_id: closing_user.id
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

    # Per-account snapshots — use computed beginning balance (not static field)
    computed_beg_all = AccountBalanceService.balances_as_of(user, month_start - 1.day)
    user.accounts.each do |account|
      AccountMonthSnapshot.find_or_initialize_by(
        user_id: user_id, year: year, month: month, account_id: account.id
      ).update!(
        beginning_balance: (computed_beg_all[account.id] || 0.0).round(2),
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
    debit_budget_ids = debit_budget.pluck(:id)
    # Compute beginning balance from AccountBalanceService (day before month start)
    # instead of the static account.beginning_balance field
    computed_beg = AccountBalanceService.balances_as_of(user, month_start - 1.day)
    beg_bal = computed_beg.select { |id, _| debit_budget_ids.include?(id) }.values.sum
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
