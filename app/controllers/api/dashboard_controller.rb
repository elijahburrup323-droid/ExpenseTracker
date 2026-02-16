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
      is_current_month = month_start == today.beginning_of_month
      as_of_date = is_current_month ? today : (month_end - 1.day)

      # Computed balances for all accounts as-of selected month
      all_balances = AccountBalanceService.balances_as_of(current_user, as_of_date)

      budget_accounts = current_user.accounts.where(include_in_budget: true)
      budget_ids = budget_accounts.pluck(:id)

      # Card 1: Spending Overview
      spent = current_user.payments
                          .where(payment_date: month_start...month_end)
                          .sum(:amount).to_f

      # Card 1 back: Spending by Category
      by_category = current_user.payments
        .where(payment_date: month_start...month_end)
        .joins(:spending_category)
        .group("spending_categories.id", "spending_categories.name", "spending_categories.icon_key", "spending_categories.color_key")
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(Arel.sql("spending_categories.id, spending_categories.name, spending_categories.icon_key, spending_categories.color_key, SUM(payments.amount)"))
        .map { |id, name, icon_key, color_key, total| { name: name, icon_key: icon_key, color_key: color_key, amount: total.to_f, pct: spent > 0 ? (total.to_f / spent * 100).round(1) : 0.0 } }

      # Card 2: Accounts (computed balances)
      accounts_for_month = current_user.accounts
                             .where("accounts.created_at <= ?", as_of_date.end_of_day)
                             .includes(:account_type).ordered
      accounts_list = accounts_for_month.map do |a|
        { name: a.name, balance: (all_balances[a.id] || 0).to_f.round(2) }
      end
      accounts_total = accounts_list.sum { |a| a[:balance] }.round(2)

      # Card 3: Net Worth (computed)
      net_worth_val = all_balances.values.sum.to_f.round(2)
      snapshots = current_user.net_worth_snapshots.recent(6).to_a.sort_by(&:snapshot_date)
      if snapshots.size >= 2
        prev_amount = snapshots[-2].amount.to_f
        nw_change = net_worth_val - prev_amount
        nw_pct = prev_amount != 0 ? ((nw_change / prev_amount) * 100).round(1) : 0
      else
        beg_total = current_user.accounts.sum(:beginning_balance).to_f
        nw_change = net_worth_val - beg_total
        nw_pct = beg_total != 0 ? ((nw_change / beg_total) * 100).round(1) : 0
      end
      snapshot_data = snapshots.map { |s| { label: s.snapshot_date.strftime("%b %Y"), amount: s.amount.to_f } }

      # Card 4: Income & Spending (computed balances)
      beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)
      beginning_balance = beg_balances.select { |id, _| budget_ids.include?(id) }.values.sum.to_f.round(2)
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
      current_balance = all_balances.select { |id, _| budget_ids.include?(id) }.values.sum.to_f.round(2)

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
        spending_overview: { spent: spent, categories: by_category },
        accounts_overview: {
          accounts: accounts_list,
          total: accounts_total
        },
        net_worth_overview: {
          value: net_worth_val,
          change: nw_change.round(2),
          change_pct: nw_pct,
          snapshots: snapshot_data
        },
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
