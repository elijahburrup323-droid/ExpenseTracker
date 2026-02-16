class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    @open_month = OpenMonthMaster.for_user(current_user)
    @accounts = current_user.accounts.includes(:account_type).ordered

    # Open-month date range — single source of truth for month-scoped cards
    @month_start = Date.new(@open_month.current_year, @open_month.current_month, 1)
    @month_end = @month_start.next_month

    # Card 1: Spending Overview (Tracking-Only mode)
    # Since bills_master does not exist, all users are in tracking-only mode.
    budget_accounts = @accounts.where(include_in_budget: true)
    @budget_total = budget_accounts.sum(:balance)
    @spent_mtd = current_user.payments
                             .where(payment_date: @month_start...@month_end)
                             .sum(:amount)

    # Card 2: Accounts — all accounts (passed as @accounts)

    # Card 3: Net Worth — sum of all account balances + historical snapshots
    @net_worth = @accounts.sum(:balance)
    @net_worth_snapshots = current_user.net_worth_snapshots.recent(6).to_a.sort_by(&:snapshot_date)
    if @net_worth_snapshots.size >= 2
      prev_amount = @net_worth_snapshots[-2].amount
      @net_worth_change = @net_worth - prev_amount
      @net_worth_pct = prev_amount != 0 ? ((@net_worth_change / prev_amount) * 100).round(1) : 0
    else
      @beginning_total = @accounts.sum(:beginning_balance)
      @net_worth_change = @net_worth - @beginning_total
      @net_worth_pct = @beginning_total != 0 ? ((@net_worth_change / @beginning_total) * 100).round(1) : 0
    end

    # Card 4: Income & Spending — open-month scoped
    @beginning_balance_total = budget_accounts.sum(:beginning_balance)
    @current_month_payments = current_user.payments
                                          .where(account_id: budget_accounts.select(:id))
                                          .where(payment_date: @month_start...@month_end)
                                          .sum(:amount)

    # Income entries received in open month for budget accounts
    @current_month_income = current_user.income_entries
                                        .where(account_id: budget_accounts.select(:id))
                                        .where(received_flag: true)
                                        .where(entry_date: @month_start...@month_end)
                                        .sum(:amount)

    # Accounts added to budget in open month (for "New Account Added" line items)
    @new_budget_accounts = budget_accounts.where(created_at: @month_start.beginning_of_day...@month_end.beginning_of_day)
                                          .where.not(beginning_balance: 0)
                                          .order(:created_at)
    @new_account_balance_total = @new_budget_accounts.sum(:beginning_balance)

    # Card 5: Recent Activity — open-month scoped, last 5 payments
    @recent_payments = current_user.payments
                                   .where(payment_date: @month_start...@month_end)
                                   .order(payment_date: :desc, sort_order: :desc)
                                   .includes(:account, spending_category: :spending_type)
                                   .limit(5)
  end
end
