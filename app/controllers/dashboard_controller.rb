class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    @accounts = current_user.accounts.includes(:account_type).ordered

    # Card 1: Budget Overview — sum of balances for accounts with include_in_budget
    @budget_total = @accounts.where(include_in_budget: true).sum(:balance)

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

    # Card 5: Recent Activity — last 5 payments
    @recent_payments = current_user.payments.ordered.includes(:account, spending_category: :spending_type).limit(5)
  end
end
