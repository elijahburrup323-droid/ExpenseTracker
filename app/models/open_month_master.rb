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

  # Section 5: Generate snapshots when closing a month
  def generate_snapshots!
    year = current_year
    month = current_month
    month_start = Date.new(year, month, 1)
    month_end = month_start.end_of_month

    ActiveRecord::Base.transaction do
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
      total_spent = user.payments
                        .where(payment_date: month_start..month_end)
                        .sum(:amount)
      total_income = user.income_entries
                         .where(received_flag: true)
                         .where(entry_date: month_start..month_end)
                         .sum(:amount)
      beg_bal = budget_accounts.sum(:beginning_balance)
      end_bal = budget_accounts.sum(:balance)
      nw = user.accounts.sum(:balance)

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
end
