class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    DashboardCard.seed_defaults_for(current_user)

    @open_month = OpenMonthMaster.for_user(current_user)
    @earliest = current_user.earliest_allowed_month
    @accounts = current_user.accounts.includes(:account_type).ordered
    @show_first_login_wizard = @accounts.empty?

    # Load slot layout
    @slots = current_user.dashboard_slots
                          .includes(dashboard_card: :dashboard_card_account_rule)
                          .order(:slot_number)

    # Open-month date range — single source of truth for month-scoped cards
    @month_start = Date.new(@open_month.current_year, @open_month.current_month, 1)
    @month_end = @month_start.next_month

    # DEBIT-only classification — reused by Card 1 budget filter, Card 3, Card 4
    credit_master_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
    spendable_master_ids = AccountTypeMaster.spendable_type_ids

    # Card 1: Spending Overview — Safe to Spend (Operating Cash)
    # Budget accounts = DEBIT + include_in_budget (unchanged for other cards)
    budget_accounts = @accounts.where(include_in_budget: true).where.not(account_type_master_id: credit_master_ids)

    # Spendable = Checking + Cash Card within budget accounts
    spendable_accounts = budget_accounts.where(account_type_master_id: spendable_master_ids)
    spendable_ids = spendable_accounts.pluck(:id)

    @spent_mtd = current_user.payments
                             .where(payment_date: @month_start...@month_end)
                             .sum(:amount)

    # Card 1: Planned spending from recurring payment occurrences in open month
    @planned_spending = 0.0
    current_user.payment_recurrings.where(use_flag: true).includes(:frequency_master).each do |pr|
      @planned_spending += pr.planned_amount_in_month(@month_start.year, @month_start.month)
    end
    current_user.recurring_obligations.active.includes(:frequency_master).each do |ob|
      if ob.falls_in_month?(@month_start.year, @month_start.month)
        @planned_spending += ob.amount.to_f
      end
    end
    @planned_spending = @planned_spending > 0 ? @planned_spending.round(2) : nil

    days_in_month = @month_start.end_of_month.day
    is_current = @month_start == Date.today.beginning_of_month
    days_elapsed = is_current ? (Date.today - @month_start).to_i + 1 : days_in_month
    @daily_avg = days_elapsed > 0 ? (@spent_mtd.to_f / days_elapsed).round(2) : 0.0
    @projected_month_end = (@daily_avg * days_in_month).round(2)
    @comparison_pct = @planned_spending && @planned_spending > 0 ? ((@spent_mtd.to_f - @planned_spending) / @planned_spending * 100).round(1) : nil
    @comparison_label = "planned"

    # Card 1 back: Spending by Category and by Type
    spent_total = @spent_mtd.to_f
    @spending_by_category = current_user.payments
      .where(payment_date: @month_start...@month_end)
      .joins(:spending_category)
      .group("spending_categories.id", "spending_categories.name", "spending_categories.icon_key", "spending_categories.color_key")
      .order(Arel.sql("SUM(payments.amount) DESC"))
      .pluck(Arel.sql("spending_categories.id, spending_categories.name, spending_categories.icon_key, spending_categories.color_key, SUM(payments.amount)"))
      .map { |id, name, icon_key, color_key, total| { id: id, name: name, icon_key: icon_key, color_key: color_key, amount: total.to_f, pct: spent_total > 0 ? (total.to_f / spent_total * 100).round(1) : 0.0 } }

    @spending_by_type = current_user.payments
      .where(payment_date: @month_start...@month_end)
      .joins(spending_category: :spending_type)
      .group("spending_types.id", "spending_types.name", "spending_types.icon_key", "spending_types.color_key")
      .order(Arel.sql("SUM(payments.amount) DESC"))
      .pluck(Arel.sql("spending_types.id, spending_types.name, spending_types.icon_key, spending_types.color_key, SUM(payments.amount)"))
      .map { |id, name, icon_key, color_key, total| { id: id, name: name, icon_key: icon_key, color_key: color_key, amount: total.to_f, pct: spent_total > 0 ? (total.to_f / spent_total * 100).round(1) : 0.0 } }

    # Enrich with spending limits
    yyyymm = @month_start.year * 100 + @month_start.month
    cat_limits = SpendingLimitHistory.limits_for_month(current_user, SpendingLimitHistory::SCOPE_CATEGORY, yyyymm)
    @spending_by_category.each do |cat|
      lim = cat_limits[cat[:id]]
      if lim
        cat[:limit] = lim.limit_value.to_f
        cat[:limit_pct_used] = cat[:limit] > 0 ? (cat[:amount] / cat[:limit] * 100).round(1) : 0.0
      end
    end

    @category_pressure = @spending_by_category
      .select { |c| c[:limit_pct_used].present? && c[:limit_pct_used] >= 80 }
      .sort_by { |c| -(c[:limit_pct_used] || 0) }
      .first(2)

    type_limits = SpendingLimitHistory.limits_for_month(current_user, SpendingLimitHistory::SCOPE_SPENDING_TYPE, yyyymm)
    @spending_by_type.each do |tp|
      lim = type_limits[tp[:id]]
      if lim
        tp[:limit_pct] = lim.limit_value.to_f
        tp[:over_under] = (tp[:pct] - lim.limit_value.to_f).round(1)
      end
    end

    # Card 1: Safe to Spend (Operating Cash only)
    @operating_balance = spendable_accounts.sum(:balance).to_f
    @reserved_savings = budget_accounts.where.not(account_type_master_id: spendable_master_ids).sum(:balance).to_f.round(2)

    # Scheduled deposits TO spendable accounts
    @scheduled_deposits = 0.0
    @scheduled_deposit_items = []
    current_user.income_recurrings.where(use_flag: true, account_id: spendable_ids).each do |ir|
      if ir.next_date && ir.next_date >= @month_start && ir.next_date < @month_end && ir.next_date >= Date.today
        @scheduled_deposits += ir.amount.to_f
        @scheduled_deposit_items << { name: ir.name, amount: ir.amount.to_f, due_date: ir.next_date }
      end
    end
    @scheduled_deposits = @scheduled_deposits.round(2)
    @scheduled_deposit_items.sort_by! { |item| item[:due_date] }

    # Scheduled payments FROM spendable accounts (+ account-less obligations)
    @scheduled_payments = 0.0
    @recurring_bills_items = []
    current_user.recurring_obligations.active.where(account_id: [nil] + spendable_ids).each do |ob|
      if ob.falls_in_month?(@month_start.year, @month_start.month)
        due = ob.due_date_in_month(@month_start.year, @month_start.month)
        if due && due >= Date.today
          @scheduled_payments += ob.amount.to_f
          @recurring_bills_items << { name: ob.name, amount: ob.amount.to_f, due_date: due }
        end
      end
    end
    current_user.payment_recurrings.where(use_flag: true, account_id: spendable_ids).each do |pr|
      if pr.next_date && pr.next_date >= @month_start && pr.next_date < @month_end
        @scheduled_payments += pr.amount.to_f
        @recurring_bills_items << { name: pr.name, amount: pr.amount.to_f, due_date: pr.next_date }
      end
    end
    @scheduled_payments = @scheduled_payments.round(2)
    @recurring_bills_items.sort_by! { |item| item[:due_date] }

    # Estimated Variable Spending: historical average per category minus current month spend
    six_months_ago = @month_start - 6.months
    historical_data = current_user.payments
      .where(payment_date: six_months_ago...@month_start)
      .group(:spending_category_id)
      .group(Arel.sql("DATE_TRUNC('month', payment_date)"))
      .sum(:amount)

    category_months = Hash.new { |h, k| h[k] = [] }
    historical_data.each do |(cat_id, _month), total|
      category_months[cat_id] << total.to_f
    end

    current_spend_by_cat = @spending_by_category.each_with_object({}) { |c, h| h[c[:id]] = c[:amount] }
    all_cat_ids = (category_months.keys + cat_limits.keys + current_spend_by_cat.keys).uniq
    cat_name_map = SpendingCategory.where(id: all_cat_ids).pluck(:id, :name).to_h

    @variable_spending_items = []
    all_cat_ids.each do |cat_id|
      lim = cat_limits[cat_id]
      months_data = category_months[cat_id]
      current_spent = current_spend_by_cat[cat_id] || 0.0

      if lim && lim.limit_value.to_f > 0
        estimate = lim.limit_value.to_f
        source = "limit"
      elsif months_data.present?
        estimate = trimmed_average(months_data)
        source = "avg"
      else
        next
      end

      remaining = [estimate - current_spent, 0].max.round(2)
      @variable_spending_items << {
        id: cat_id, name: cat_name_map[cat_id] || "Unknown",
        estimate: estimate.round(2), spent: current_spent.round(2),
        remaining: remaining, source: source
      }
    end
    @variable_spending_items.sort_by! { |item| -item[:remaining] }
    @variable_spending_total = @variable_spending_items.sum { |item| item[:remaining] }.round(2)

    # Projected Safe To Spend = Available Cash - Recurring Bills - Estimated Variable Spending
    @projected_safe_to_spend = (@operating_balance - @scheduled_payments - @variable_spending_total).round(2)

    # Cash Available To Spend = Cash In Spending Accounts + Remaining Deposits - Remaining Bills
    @cash_available_to_spend = (@operating_balance + @scheduled_deposits - @scheduled_payments).round(2)

    # Legacy safe_to_spend
    @safe_to_spend = (@operating_balance + @scheduled_deposits - @scheduled_payments).round(2)
    @days_remaining = is_current ? (@month_start.end_of_month - Date.today).to_i : 0
    @safe_daily_spend = @days_remaining > 0 ? (@safe_to_spend / @days_remaining).round(2) : 0.0

    # Card 1 back: Spending by Tag (split amount evenly across a payment's tags)
    month_payments = current_user.payments
      .where(payment_date: @month_start...@month_end)
      .includes(:tags)
    tag_totals = Hash.new(0.0)
    tag_names = {}
    month_payments.each do |p|
      next if p.tags.empty?
      share = p.amount.to_f / p.tags.size
      p.tags.each do |t|
        tag_totals[t.id] += share
        tag_names[t.id] ||= t.name
      end
    end
    @spending_by_tag = tag_totals.sort_by { |_id, amt| -amt }.map do |id, amt|
      { id: id, name: tag_names[id], amount: amt.round(2), pct: spent_total > 0 ? (amt / spent_total * 100).round(1) : 0.0 }
    end

    # Card 1 back (expanded): Deposits Breakdown by description
    income_total = @current_month_income.to_f
    @deposits_breakdown = current_user.income_entries
      .where(account_id: budget_accounts.select(:id))
      .where(received_flag: true)
      .where(entry_date: @month_start...@month_end)
      .group(:description)
      .sum(:amount)
      .sort_by { |_desc, amt| -amt.to_f }
      .map { |desc, amt| { name: desc, amount: amt.to_f.round(2), pct: income_total > 0 ? (amt.to_f / income_total * 100).round(1) : 0.0 } }

    # Card 2: Accounts — all accounts (passed as @accounts)

    # Card 3: Net Worth — canonical aggregator (Accounts + Assets + Investments + Financing)
    nw = Account.net_worth_for(@accounts, user: current_user)
    @net_worth = nw[:net_worth]
    @net_worth_assets = nw[:assets].round(2)
    @net_worth_liabilities = nw[:liabilities].abs.round(2)
    # Component breakdown for back-of-card
    @nw_accounts_subtotal = nw[:accounts_subtotal].round(2)
    @nw_asset_module_total = nw[:asset_module_total].round(2)
    @nw_investment_module_total = nw[:investment_module_total].round(2)
    @nw_liabilities_subtotal = nw[:liabilities_subtotal].round(2)

    # Metric swap: Debt Ratio (leveraged) vs Cash Coverage (cash-dominant)
    noncash_total = Asset.where(user_id: current_user.id, include_in_net_worth: true).where(deleted_at: nil).sum(:current_value).to_f +
      InvestmentHolding.joins(:investment_account)
        .where(investment_accounts: { user_id: current_user.id, include_in_net_worth: true, active: true })
        .where(investment_holdings: { deleted_at: nil }).where.not(investment_holdings: { current_price: nil })
        .sum("investment_holdings.shares_held * investment_holdings.current_price").to_f +
      FinancingInstrument.where(user_id: current_user.id, instrument_type: "RECEIVABLE", include_in_net_worth: true)
        .where(deleted_at: nil).sum(:current_principal).to_f

    if noncash_total > 0
      @nw_metric_label = "Debt Ratio"
      @nw_metric_value = @net_worth_assets > 0 ? (@net_worth_liabilities / @net_worth_assets * 100).round(1) : nil
      @nw_metric_mode = :debt_ratio
    else
      @nw_metric_label = "Cash Coverage"
      if @net_worth_liabilities > 0
        cash_assets = @accounts.where.not(account_type_master_id: credit_master_ids).sum(:balance).to_f.round(2)
        @nw_metric_value = (cash_assets / @net_worth_liabilities * 100).round(1)
      else
        @nw_metric_value = nil
      end
      @nw_metric_mode = :cash_coverage
    end
    NetWorthSnapshot.backfill_for_user!(current_user)
    @net_worth_snapshots = current_user.net_worth_snapshots.eligible_for_user(current_user).recent(6).to_a.sort_by(&:snapshot_date)
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

    # Current Balance = Beginning Balance + Deposits − Payments (deterministic formula)
    @budget_total = (@beginning_balance_total + @current_month_income.to_f - @current_month_payments.to_f).round(2)

    # Accounts added to budget in open month (for "New Account Added" line items)
    @new_budget_accounts = budget_accounts.where(created_at: @month_start.beginning_of_day...@month_end.beginning_of_day)
                                          .where.not(beginning_balance: 0)
                                          .order(:created_at)
    @new_account_balance_total = @new_budget_accounts.sum(:beginning_balance)

    # Card 5: Recent Activity — merged payments + deposits (Calm Scroll, Instruction R)
    payments_base = current_user.payments.where(payment_date: @month_start...@month_end)
    income_base = current_user.income_entries
                              .where(received_flag: true)
                              .where(entry_date: @month_start...@month_end)

    # Merge payments and deposits into one list sorted by date DESC
    payment_items = payments_base
                      .order(payment_date: :desc, sort_order: :desc)
                      .includes(:account, spending_category: :spending_type)
                      .map { |p| { type: :payment, date: p.payment_date, description: p.description, amount: p.amount.to_f, category: p.spending_category&.name } }
    deposit_items = income_base
                      .order(entry_date: :desc)
                      .includes(:account)
                      .map { |d| { type: :deposit, date: d.entry_date, description: d.description, amount: d.amount.to_f, category: nil } }
    @recent_activity_items = (payment_items + deposit_items).sort_by { |i| -i[:date].to_time.to_i }

    # Keep legacy variables for backward compat (pagination, back side)
    @recent_payments_total = payments_base.count
    @recent_payments_has_more = @recent_payments_total > 10
    @recent_payments = payments_base
                         .order(payment_date: :desc, sort_order: :desc)
                         .includes(:account, spending_category: :spending_type)
                         .limit(10)

    # Card 5: Net activity summary
    total_payments = payments_base.sum(:amount).to_f
    total_income = income_base.sum(:amount).to_f
    income_count = income_base.count
    @net_activity = (total_income - total_payments).round(2)
    @activity_transaction_count = @recent_payments_total + income_count

    # Card 4 back & Card 5 back: All income entries for the month (scrollable)
    @recent_income_entries = current_user.income_entries
                                         .where(received_flag: true)
                                         .where(entry_date: @month_start...@month_end)
                                         .order(entry_date: :desc)
                                         .includes(:account)

    # Card 6: Buckets summary (grouped by account)
    user_buckets = current_user.buckets.active.includes(:account).ordered
    if user_buckets.empty?
      @buckets_summary = { empty: true }
    else
      grouped = user_buckets.group_by(&:account)
      account_groups = grouped.map do |account, buckets|
        {
          account_name: account&.name || "Unknown",
          account_total: buckets.sum(&:current_balance).to_f.round(2),
          buckets: buckets.sort_by { |b| b.name.to_s }
        }
      end.sort_by { |g| g[:account_name] }
      next_rec = user_buckets
        .select { |b| b.target_amount.present? && b.target_amount > 0 && b.current_balance < b.target_amount }
        .max_by { |b| b.target_amount.to_f - b.current_balance.to_f }
      largest = user_buckets.max_by { |b| b.current_balance.to_f }
      priority_sorted = user_buckets.sort_by { |b| [b.priority.to_i, b.name.to_s] }
      @buckets_summary = {
        empty: false,
        count: user_buckets.size,
        total_balance: user_buckets.sum(&:current_balance).to_f.round(2),
        account_groups: account_groups,
        next_recommended: next_rec,
        largest_bucket: largest,
        priority_sorted: priority_sorted
      }
    end

    # Financial Pulse strip metrics
    @pulse_liquidity = @planned_spending && @planned_spending > 0 ? ((@operating_balance + @reserved_savings) / @planned_spending).round(1) : nil
    @pulse_debt_ratio = @net_worth_assets > 0 ? (@net_worth_liabilities / @net_worth_assets * 100).round(1) : nil
    @pulse_savings_rate = @current_month_income.to_f > 0 ? ((@current_month_income.to_f - @current_month_payments.to_f) / @current_month_income.to_f * 100).round(1) : nil

    # Smart Suggestions — evaluate and get top suggestion for banner
    begin
      evaluator = SmartSuggestionEvaluator.new(current_user)
      evaluator.evaluate
      @top_suggestion = evaluator.top_suggestion
    rescue => e
      Rails.logger.error("SmartSuggestionEvaluator failed for user #{current_user.id}: #{e.class}: #{e.message}")
      @top_suggestion = nil
    end
  end

  private

  def trimmed_average(values)
    return 0.0 if values.empty?
    return values.sum / values.size.to_f if values.size < 4
    sorted = values.sort
    trimmed = sorted[1..-2]
    trimmed.sum / trimmed.size.to_f
  end
end
