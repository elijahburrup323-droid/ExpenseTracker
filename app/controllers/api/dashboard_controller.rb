module Api
  class DashboardController < BaseController
    # GET /api/dashboard/card_data?month=2&year=2026
    def card_data
      month = (params[:month] || Date.today.month).to_i
      year = (params[:year] || Date.today.year).to_i
      month_start = Date.new(year, month, 1)
      month_end = month_start.next_month  # half-open: [month_start, month_end)

      # Don't allow navigating beyond current month
      today = Date.today
      can_go_forward = month_start < today.beginning_of_month

      budget_accounts = current_user.accounts.where(include_in_budget: true)

      # Card 1: Spending Overview
      spent = current_user.payments
                          .where(payment_date: month_start...month_end)
                          .sum(:amount).to_f

      # Card 4: Income & Spending
      beginning_balance = budget_accounts.sum(:beginning_balance).to_f
      expenses = current_user.payments
                             .where(account_id: budget_accounts.select(:id))
                             .where(payment_date: month_start...month_end)
                             .sum(:amount).to_f
      income = current_user.income_entries
                           .where(account_id: budget_accounts.select(:id))
                           .where(received_flag: true)
                           .where(entry_date: month_start...month_end)
                           .sum(:amount).to_f
      new_accounts = budget_accounts
                       .where(created_at: month_start.beginning_of_day...month_end.beginning_of_day)
                       .where.not(beginning_balance: 0)
                       .order(:created_at)
                       .map { |a| { name: a.name, beginning_balance: a.beginning_balance.to_f } }
      current_balance = budget_accounts.sum(:balance).to_f

      # Card 5: Recent Activity
      recent = current_user.payments
                           .where(payment_date: month_start...month_end)
                           .order(payment_date: :desc, sort_order: :desc)
                           .includes(:account, spending_category: :spending_type)
                           .limit(5)
                           .map { |p| { date: p.payment_date.strftime("%-m/%-d"), description: p.description, amount: p.amount.to_f } }

      render json: {
        month: month,
        year: year,
        month_label: month_start.strftime("%B %Y"),
        can_go_forward: can_go_forward,
        spending_overview: { spent: spent },
        income_spending: {
          beginning_balance: beginning_balance,
          income: income,
          expenses: expenses,
          new_accounts: new_accounts,
          current_balance: current_balance
        },
        recent_activity: recent
      }
    end
  end
end
