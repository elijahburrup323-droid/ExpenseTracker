class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    DashboardCard.seed_defaults_for(current_user)

    @open_month = OpenMonthMaster.for_user(current_user)
    @accounts = current_user.accounts.includes(:account_type).ordered

    # Load slot layout
    @slots = current_user.dashboard_slots
                          .includes(dashboard_card: :dashboard_card_account_rule)
                          .order(:slot_number)

    # Open-month date range — single source of truth for month-scoped cards
    @month_start = Date.new(@open_month.current_year, @open_month.current_month, 1)
    @month_end = @month_start.next_month

    # Card 1: Spending Overview (Tracking-Only mode)
    # Since bills_master does not exist, all users are in tracking-only mode.
    budget_accounts = @accounts.where(include_in_budget: true)
    @spent_mtd = current_user.payments
                             .where(payment_date: @month_start...@month_end)
                             .sum(:amount)

    # Card 1 back: Spending by Category
    spent_total = @spent_mtd.to_f
    @spending_by_category = current_user.payments
      .where(payment_date: @month_start...@month_end)
      .joins(:spending_category)
      .group("spending_categories.id", "spending_categories.name", "spending_categories.icon_key", "spending_categories.color_key")
      .order(Arel.sql("SUM(payments.amount) DESC"))
      .pluck(Arel.sql("spending_categories.id, spending_categories.name, spending_categories.icon_key, spending_categories.color_key, SUM(payments.amount)"))
      .map { |id, name, icon_key, color_key, total| { name: name, icon_key: icon_key, color_key: color_key, amount: total.to_f, pct: spent_total > 0 ? (total.to_f / spent_total * 100).round(1) : 0.0 } }

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

    # Card 4: Income & Spending — computed balances
    is_current_month = @month_start == Date.today.beginning_of_month
    as_of_date = is_current_month ? Date.today : (@month_end - 1.day)
    all_balances = AccountBalanceService.balances_as_of(current_user, as_of_date)
    budget_ids = budget_accounts.pluck(:id)
    beg_balances = AccountBalanceService.balances_as_of(current_user, @month_start - 1.day)
    @beginning_balance_total = beg_balances.select { |id, _| budget_ids.include?(id) }.values.sum.to_f
    @budget_total = all_balances.select { |id, _| budget_ids.include?(id) }.values.sum.to_f
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
