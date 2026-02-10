class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    @accounts = current_user.accounts.includes(:account_type).ordered

    # Card 1: Spending Overview (Tracking-Only mode)
    # Since bills_master does not exist, all users are in tracking-only mode.
    @budget_total = @accounts.where(include_in_budget: true).sum(:balance)
    @spent_mtd = current_user.payments
                             .where(payment_date: Date.today.beginning_of_month..Date.today)
                             .sum(:amount)

    # Card 2: Accounts — all accounts (passed as @accounts)

    # Card 3: Net Worth — sum of all account balances
    @net_worth = @accounts.sum(:balance)
    @beginning_total = @accounts.sum(:beginning_balance)
    @net_worth_change = @net_worth - @beginning_total
    @net_worth_pct = @beginning_total != 0 ? ((@net_worth_change / @beginning_total) * 100).round(1) : 0

    # Card 4: Income & Spending — current month payments
    @current_month_start = Date.today.beginning_of_month
    budget_accounts = @accounts.where(include_in_budget: true)
    @current_month_payments = current_user.payments.where(account_id: budget_accounts.select(:id)).where(payment_date: @current_month_start..Date.today).sum(:amount)
    @beginning_balance_total = budget_accounts.sum(:beginning_balance)

    # Income entries received this month for budget accounts
    @current_month_income = current_user.income_entries
                                        .where(account_id: budget_accounts.select(:id))
                                        .where(received_flag: true)
                                        .where(entry_date: @current_month_start..Date.today)
                                        .sum(:amount)

    # Accounts added to budget this month (for "Initial Balance Added" line items)
    @new_budget_accounts = budget_accounts.where(created_at: @current_month_start.beginning_of_day..)
                                          .where.not(beginning_balance: 0)
                                          .order(:created_at)
    @new_account_balance_total = @new_budget_accounts.sum(:beginning_balance)

    # Card 5: Recent Activity — last 5 payments (exclude future dates)
    @recent_payments = current_user.payments.where("payment_date <= ?", Date.current).ordered.includes(:account, spending_category: :spending_type).limit(5)
  end
end
