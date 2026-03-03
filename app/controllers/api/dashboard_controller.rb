module Api
  class DashboardController < BaseController
    # GET /api/dashboard/card_data?month=2&year=2026
    def card_data
      DashboardCard.seed_defaults_for(current_user)

      month = (params[:month] || Date.today.month).to_i
      year = (params[:year] || Date.today.year).to_i
      month = month.clamp(1, 12)
      year = year.clamp(2000, 2100)

      # CM-25: Clamp to earliest allowed month
      earliest = current_user.earliest_allowed_month
      if year < earliest[:year] || (year == earliest[:year] && month < earliest[:month])
        year = earliest[:year]
        month = earliest[:month]
      end

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

      # Pre-compute shared data
      beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)

      # Build slot-ordered card data
      slots = current_user.dashboard_slots
                           .includes(dashboard_card: :dashboard_card_account_rule)
                           .order(:slot_number)

      # Tag filter (optional, only affects spending_overview, income_spending, recent_activity)
      tag_ids = Array(params[:tag_ids]).map(&:to_i).reject(&:zero?)

      context = {
        month_start: month_start, month_end: month_end,
        as_of_date: as_of_date, all_balances: all_balances,
        beg_balances: beg_balances,
        budget_accounts: budget_accounts, budget_ids: budget_ids,
        tag_ids: tag_ids,
        page: params[:page]
      }

      slots_data = slots.filter_map do |slot|
        card = slot.dashboard_card
        next unless card&.is_active

        card_data = compute_card_data(card.card_type, context)
        {
          slot_number: slot.slot_number,
          card_key: card.card_key,
          card_type: card.card_type,
          title: card.title,
          data: card_data
        }
      end

      # Build response with both slot array and backward-compat flat keys
      response = {
        month: month,
        year: year,
        month_label: month_start.strftime("%B %Y"),
        can_go_forward: can_go_forward,
        earliest_month: earliest[:month],
        earliest_year: earliest[:year],
        slots: slots_data
      }

      # Backward-compat flat keys from slot data
      spending_data = nil
      nw_data = nil
      is_data = nil
      slots_data.each do |s|
        case s[:card_type]
        when "spending_overview"
          response[:spending_overview] = s[:data]
          spending_data = s[:data]
        when "accounts_overview"
          response[:accounts_overview] = s[:data]
        when "net_worth"
          response[:net_worth_overview] = s[:data]
          nw_data = s[:data]
        when "income_spending"
          response[:income_spending] = s[:data]
          is_data = s[:data]
        when "recent_activity"
          response[:recent_activity] = s[:data][:recent]
        end
      end

      # Financial Pulse strip metrics
      cash_balance = (spending_data&.dig(:available_to_spend) || 0).to_f + (spending_data&.dig(:scheduled_remaining) || 0).to_f
      avg3 = spending_data&.dig(:three_month_avg)
      assets = nw_data&.dig(:assets)
      liabilities = nw_data&.dig(:liabilities)
      income = is_data&.dig(:income)
      expenses = is_data&.dig(:expenses)

      response[:pulse] = {
        liquidity: avg3 && avg3 > 0 ? (cash_balance / avg3).round(1) : nil,
        debt_ratio: assets && assets > 0 ? (liabilities.to_f / assets * 100).round(1) : nil,
        savings_rate: income && income > 0 ? ((income - (expenses || 0).to_f) / income * 100).round(1) : nil
      }

      render json: response
    end

    # GET /api/dashboard/recent_activity_page?month=2&year=2026&page=2
    def recent_activity_page
      month = (params[:month] || Date.today.month).to_i.clamp(1, 12)
      year = (params[:year] || Date.today.year).to_i.clamp(2000, 2100)
      month_start = Date.new(year, month, 1)
      month_end = month_start.next_month
      tag_ids = Array(params[:tag_ids]).map(&:to_i).reject(&:zero?)

      ctx = { month_start: month_start, month_end: month_end, tag_ids: tag_ids, page: params[:page] }
      render json: compute_recent_activity(ctx)
    end

    # PUT /api/dashboard/reorder_slots
    def reorder_slots
      DashboardCard.seed_defaults_for(current_user)

      assignments = params.require(:slots)
      ActiveRecord::Base.transaction do
        # Clear all slots first to avoid unique constraint violations during swap
        current_user.dashboard_slots.update_all(dashboard_card_id: nil)

        assignments.each do |assignment|
          slot = current_user.dashboard_slots.find_by!(slot_number: assignment[:slot_number])
          card = current_user.dashboard_cards.find_by!(card_key: assignment[:card_key])
          slot.update!(dashboard_card: card)
        end
      end
      render json: { success: true }
    rescue ActiveRecord::RecordNotFound => e
      render json: { error: e.message }, status: :not_found
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    private

    def compute_card_data(card_type, ctx)
      case card_type
      when "spending_overview"
        compute_spending_overview(ctx)
      when "accounts_overview"
        compute_accounts_overview(ctx)
      when "net_worth"
        compute_net_worth(ctx)
      when "income_spending"
        compute_income_spending(ctx)
      when "recent_activity"
        compute_recent_activity(ctx)
      when "buckets"
        compute_buckets(ctx)
      else
        {}
      end
    end

    def tag_filtered_scope(scope, tag_ids, taggable_type = "Payment")
      return scope if tag_ids.blank?
      scope.where(id: TagAssignment.where(taggable_type: taggable_type, tag_id: tag_ids).select(:taggable_id))
    end

    def compute_spending_overview(ctx)
      base_payments = tag_filtered_scope(
        current_user.payments.where(payment_date: ctx[:month_start]...ctx[:month_end]),
        ctx[:tag_ids]
      )
      spent = base_payments.sum(:amount).to_f

      # 3-month average from closed-month snapshots
      prior_snapshots = DashboardMonthSnapshot.where(user: current_user)
        .active
        .where("(year * 100 + month) < ?", ctx[:month_start].year * 100 + ctx[:month_start].month)
        .order(Arel.sql("year DESC, month DESC"))
        .limit(3)
      three_month_avg = prior_snapshots.size >= 1 ? (prior_snapshots.sum(&:total_spent).to_f / prior_snapshots.size).round(2) : nil

      # Daily average + projected month-end
      days_in_month = ctx[:month_start].end_of_month.day
      days_elapsed = if ctx[:month_start] == Date.today.beginning_of_month
                       (Date.today - ctx[:month_start]).to_i + 1
                     else
                       days_in_month
                     end
      daily_avg = days_elapsed > 0 ? (spent / days_elapsed).round(2) : 0.0
      projected_month_end = (daily_avg * days_in_month).round(2)

      # Comparison vs 3-month avg (tracking mode)
      comparison_pct = three_month_avg && three_month_avg > 0 ? ((spent - three_month_avg) / three_month_avg * 100).round(1) : nil
      comparison_label = "3-month avg"

      by_category = base_payments
        .joins(:spending_category)
        .group("spending_categories.id", "spending_categories.name", "spending_categories.icon_key", "spending_categories.color_key")
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(Arel.sql("spending_categories.id, spending_categories.name, spending_categories.icon_key, spending_categories.color_key, SUM(payments.amount)"))
        .map { |id, name, icon_key, color_key, total| { id: id, name: name, icon_key: icon_key, color_key: color_key, amount: total.to_f, pct: spent > 0 ? (total.to_f / spent * 100).round(1) : 0.0 } }

      by_type = base_payments
        .joins(spending_category: :spending_type)
        .group("spending_types.id", "spending_types.name", "spending_types.icon_key", "spending_types.color_key")
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(Arel.sql("spending_types.id, spending_types.name, spending_types.icon_key, spending_types.color_key, SUM(payments.amount)"))
        .map { |id, name, icon_key, color_key, total| { id: id, name: name, icon_key: icon_key, color_key: color_key, amount: total.to_f, pct: spent > 0 ? (total.to_f / spent * 100).round(1) : 0.0 } }

      # Enrich with spending limits
      yyyymm = ctx[:month_start].year * 100 + ctx[:month_start].month
      cat_limits = SpendingLimitHistory.limits_for_month(current_user, SpendingLimitHistory::SCOPE_CATEGORY, yyyymm)
      by_category.each do |cat|
        lim = cat_limits[cat[:id]]
        if lim
          cat[:limit] = lim.limit_value.to_f
          cat[:limit_pct_used] = cat[:limit] > 0 ? (cat[:amount] / cat[:limit] * 100).round(1) : 0.0
        end
      end

      type_limits = SpendingLimitHistory.limits_for_month(current_user, SpendingLimitHistory::SCOPE_SPENDING_TYPE, yyyymm)
      by_type.each do |tp|
        lim = type_limits[tp[:id]]
        if lim
          tp[:limit_pct] = lim.limit_value.to_f
          tp[:over_under] = (tp[:pct] - lim.limit_value.to_f).round(1)
        end
      end

      # Spending by Tag (split payment amount evenly across tags)
      month_payments = base_payments.includes(:tags).to_a
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
      by_tag = tag_totals.sort_by { |_id, amt| -amt }.map do |id, amt|
        { id: id, name: tag_names[id], amount: amt.round(2), pct: spent > 0 ? (amt / spent * 100).round(1) : 0.0 }
      end

      # Safe to Spend (Operating Cash only)
      credit_master_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
      spendable_master_ids = AccountTypeMaster.spendable_type_ids
      budget_accounts = current_user.accounts.where(include_in_budget: true).where.not(account_type_master_id: credit_master_ids)
      spendable_accounts = budget_accounts.where(account_type_master_id: spendable_master_ids)
      spendable_ids = spendable_accounts.pluck(:id)

      operating_balance = spendable_accounts.sum(:balance).to_f
      reserved_savings = budget_accounts.where.not(account_type_master_id: spendable_master_ids).sum(:balance).to_f.round(2)

      # Scheduled deposits TO spendable accounts
      scheduled_deposits = 0.0
      current_user.income_recurrings.where(use_flag: true, account_id: spendable_ids).each do |ir|
        if ir.next_date && ir.next_date >= ctx[:month_start] && ir.next_date < ctx[:month_end]
          scheduled_deposits += ir.amount.to_f
        end
      end

      # Scheduled payments FROM spendable accounts (+ account-less obligations)
      scheduled_payments = 0.0
      current_user.recurring_obligations.active.where(account_id: [nil] + spendable_ids).each do |ob|
        if ob.falls_in_month?(ctx[:month_start].year, ctx[:month_start].month)
          due = ob.due_date_in_month(ctx[:month_start].year, ctx[:month_start].month)
          scheduled_payments += ob.amount.to_f if due && due >= Date.today
        end
      end
      current_user.payment_recurrings.where(use_flag: true, account_id: spendable_ids).each do |pr|
        if pr.next_date && pr.next_date >= ctx[:month_start] && pr.next_date < ctx[:month_end]
          scheduled_payments += pr.amount.to_f
        end
      end

      safe_to_spend = (operating_balance + scheduled_deposits - scheduled_payments).round(2)
      is_current_month = ctx[:month_start] == Date.today.beginning_of_month
      days_remaining = is_current_month ? (ctx[:month_start].end_of_month - Date.today).to_i : 0
      safe_daily_spend = days_remaining > 0 ? (safe_to_spend / days_remaining).round(2) : 0.0

      # Category pressure: top 2 categories closest to (or over) their limits
      category_pressure = by_category
        .select { |c| c[:limit_pct_used].present? && c[:limit_pct_used] >= 80 }
        .sort_by { |c| -(c[:limit_pct_used] || 0) }
        .first(2)
        .map { |c| { name: c[:name], pct_used: c[:limit_pct_used], amount: c[:amount], limit: c[:limit], color_key: c[:color_key] } }

      {
        spent: spent,
        three_month_avg: three_month_avg,
        comparison_pct: comparison_pct,
        comparison_label: comparison_label,
        daily_avg: daily_avg,
        projected_month_end: projected_month_end,
        days_elapsed: days_elapsed,
        days_in_month: days_in_month,
        safe_to_spend: safe_to_spend,
        operating_balance: operating_balance.round(2),
        scheduled_deposits: scheduled_deposits.round(2),
        scheduled_payments: scheduled_payments.round(2),
        reserved_savings: reserved_savings,
        available_to_spend: safe_to_spend,  # backward compat alias
        safe_daily_spend: safe_daily_spend,
        days_remaining: days_remaining,
        category_pressure: category_pressure,
        categories: by_category, types: by_type, tags: by_tag
      }
    end

    def compute_accounts_overview(ctx)
      credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id).to_set
      liquid_ids = AccountTypeMaster.liquid_type_ids.to_set
      all_accounts = current_user.accounts.includes(:account_type, :account_type_master).ordered
      liquid_total = 0.0
      liquid_count = 0
      accounts_list = all_accounts.map do |a|
        bal = (ctx[:all_balances][a.id] || a.balance).to_f
        is_liability = credit_ids.include?(a.account_type_master_id)
        if liquid_ids.include?(a.account_type_master_id)
          liquid_total += bal
          liquid_count += 1
        end
        display_bal = bal
        { name: a.name, balance: bal.round(2), display_balance: display_bal.round(2), normal_balance_type: is_liability ? "CREDIT" : "DEBIT" }
      end
      nw = Account.net_worth_for(current_user.accounts, user: current_user)

      { accounts: accounts_list, total: nw[:accounts_total].round(2), liquid_total: liquid_total.round(2), liquid_count: liquid_count }
    end

    def compute_net_worth(ctx)
      nw = Account.net_worth_for(current_user.accounts, user: current_user)
      net_worth_val = nw[:net_worth].round(2)
      NetWorthSnapshot.backfill_for_user!(current_user)
      snapshots = current_user.net_worth_snapshots.eligible_for_user(current_user).recent(6).to_a.sort_by(&:snapshot_date)
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

      assets = nw[:assets].round(2)
      liabilities = nw[:liabilities].abs.round(2)

      # Metric swap: Debt Ratio (leveraged) vs Cash Coverage (cash-dominant)
      credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
      cash_assets = current_user.accounts.where.not(account_type_master_id: credit_ids).sum(:balance).to_f.round(2)
      noncash_total = Asset.where(user_id: current_user.id, include_in_net_worth: true).where(deleted_at: nil).sum(:current_value).to_f +
        InvestmentHolding.joins(:investment_account)
          .where(investment_accounts: { user_id: current_user.id, include_in_net_worth: true, active: true })
          .where(investment_holdings: { deleted_at: nil }).where.not(investment_holdings: { current_price: nil })
          .sum("investment_holdings.shares_held * investment_holdings.current_price").to_f +
        FinancingInstrument.where(user_id: current_user.id, instrument_type: "RECEIVABLE", include_in_net_worth: true)
          .where(deleted_at: nil).sum(:current_principal).to_f

      if noncash_total > 0
        metric_label = "Debt Ratio"
        metric_value = assets > 0 ? (liabilities / assets * 100).round(1) : nil
        metric_mode = "debt_ratio"
      else
        metric_label = "Cash Coverage"
        metric_value = liabilities > 0 ? (cash_assets / liabilities * 100).round(1) : nil
        metric_mode = "cash_coverage"
      end

      { value: net_worth_val, change: nw_change.round(2), change_pct: nw_pct, snapshots: snapshot_data,
        assets: assets, liabilities: liabilities, debt_ratio: metric_value,
        metric_label: metric_label, metric_value: metric_value, metric_mode: metric_mode,
        accounts_subtotal: nw[:accounts_subtotal].round(2),
        asset_module_total: (nw[:asset_module_total] || 0).round(2),
        investment_module_total: (nw[:investment_module_total] || 0).round(2),
        liabilities_subtotal: (nw[:liabilities_subtotal] || 0).round(2) }
    end

    def compute_income_spending(ctx)
      beginning_balance = ctx[:beg_balances].select { |id, _| ctx[:budget_ids].include?(id) }.values.sum.to_f.round(2)
      expenses = tag_filtered_scope(
        current_user.payments
          .where(account_id: ctx[:budget_accounts].select(:id))
          .where(payment_date: ctx[:month_start]...ctx[:month_end]),
        ctx[:tag_ids]
      ).sum(:amount).to_f
      income = tag_filtered_scope(
        current_user.income_entries
          .where(account_id: ctx[:budget_accounts].select(:id))
          .where(received_flag: true)
          .where(entry_date: ctx[:month_start]...ctx[:month_end]),
        ctx[:tag_ids], "IncomeEntry"
      ).sum(:amount).to_f
      new_accounts = ctx[:budget_accounts]
                       .where(created_at: ctx[:month_start].beginning_of_day...ctx[:month_end].beginning_of_day)
                       .where.not(beginning_balance: 0)
                       .order(:created_at)
                       .map { |a| { name: a.name, beginning_balance: a.beginning_balance.to_f } }
      current_balance = ctx[:all_balances].select { |id, _| ctx[:budget_ids].include?(id) }.values.sum.to_f.round(2)

      net_change = (income - expenses).round(2)
      savings_rate = income > 0 ? ((net_change / income) * 100).round(1) : nil

      { beginning_balance: beginning_balance, income: income, expenses: expenses, net_change: net_change, savings_rate: savings_rate, new_accounts: new_accounts, current_balance: current_balance }
    end

    RECENT_ACTIVITY_PAGE_SIZE = 10

    def compute_recent_activity(ctx)
      page = (ctx[:page] || 1).to_i.clamp(1, 1000)
      per_page = RECENT_ACTIVITY_PAGE_SIZE

      base = tag_filtered_scope(
        current_user.payments.where(payment_date: ctx[:month_start]...ctx[:month_end]),
        ctx[:tag_ids]
      )

      total_count = base.count
      recent = base
                 .order(payment_date: :desc, sort_order: :desc)
                 .includes(:account, spending_category: :spending_type)
                 .offset((page - 1) * per_page)
                 .limit(per_page)
                 .map { |p| { date: p.payment_date.strftime("%-m/%-d"), description: p.description, amount: p.amount.to_f } }

      # Net activity summary: deposits minus payments for the month
      income_base = tag_filtered_scope(
        current_user.income_entries
          .where(received_flag: true)
          .where(entry_date: ctx[:month_start]...ctx[:month_end]),
        ctx[:tag_ids], "IncomeEntry"
      )
      total_payments = base.sum(:amount).to_f
      total_income = income_base.sum(:amount).to_f
      net_activity = (total_income - total_payments).round(2)
      transaction_count = total_count + income_base.count

      { recent: recent, total_count: total_count, page: page, per_page: per_page, has_more: (page * per_page) < total_count,
        net_activity: net_activity, transaction_count: transaction_count }
    end

    def compute_buckets(_ctx)
      buckets = current_user.buckets.active.includes(:account).ordered
      return { empty: true, count: 0, total_balance: 0, buckets: [], next_recommended: nil } if buckets.empty?

      total_balance = buckets.sum(&:current_balance).to_f.round(2)

      top_buckets = buckets.sort_by { |b| -b.current_balance.to_f }.first(5).map do |b|
        has_target = b.target_amount.present? && b.target_amount > 0
        pct = has_target ? [(b.current_balance.to_f / b.target_amount.to_f * 100).round(1), 100].min : nil
        remaining = has_target ? [(b.target_amount.to_f - b.current_balance.to_f).round(2), 0].max : nil
        {
          name: b.name,
          balance: b.current_balance.to_f.round(2),
          target: b.target_amount&.to_f&.round(2),
          progress_pct: pct,
          remaining: remaining,
          account_name: b.account&.name || "[Deleted]",
          is_default: b.is_default
        }
      end

      # Next recommended allocation: bucket with highest remaining among all active buckets with targets
      next_rec = buckets
        .select { |b| b.target_amount.present? && b.target_amount > 0 && b.current_balance < b.target_amount }
        .max_by { |b| b.target_amount.to_f - b.current_balance.to_f }
      next_recommended = next_rec ? {
        name: next_rec.name,
        remaining: (next_rec.target_amount.to_f - next_rec.current_balance.to_f).round(2)
      } : nil

      {
        empty: false,
        count: buckets.size,
        total_balance: total_balance,
        buckets: top_buckets,
        next_recommended: next_recommended
      }
    end
  end
end
