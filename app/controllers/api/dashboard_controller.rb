module Api
  class DashboardController < BaseController
    # GET /api/dashboard/card_data?month=2&year=2026
    def card_data
      DashboardCard.seed_defaults_for(current_user)

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

      # Pre-compute shared data
      beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)

      # Build slot-ordered card data
      slots = current_user.dashboard_slots
                           .includes(dashboard_card: :dashboard_card_account_rule)
                           .order(:slot_number)

      context = {
        month_start: month_start, month_end: month_end,
        as_of_date: as_of_date, all_balances: all_balances,
        beg_balances: beg_balances,
        budget_accounts: budget_accounts, budget_ids: budget_ids
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
        slots: slots_data
      }

      # Backward-compat flat keys from slot data
      slots_data.each do |s|
        case s[:card_type]
        when "spending_overview"
          response[:spending_overview] = s[:data]
        when "accounts_overview"
          response[:accounts_overview] = s[:data]
        when "net_worth"
          response[:net_worth_overview] = s[:data]
        when "income_spending"
          response[:income_spending] = s[:data]
        when "recent_activity"
          response[:recent_activity] = s[:data][:recent]
        end
      end

      render json: response
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
        { placeholder: true }
      else
        {}
      end
    end

    def compute_spending_overview(ctx)
      spent = current_user.payments
                          .where(payment_date: ctx[:month_start]...ctx[:month_end])
                          .sum(:amount).to_f

      by_category = current_user.payments
        .where(payment_date: ctx[:month_start]...ctx[:month_end])
        .joins(:spending_category)
        .group("spending_categories.id", "spending_categories.name", "spending_categories.icon_key", "spending_categories.color_key")
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(Arel.sql("spending_categories.id, spending_categories.name, spending_categories.icon_key, spending_categories.color_key, SUM(payments.amount)"))
        .map { |id, name, icon_key, color_key, total| { id: id, name: name, icon_key: icon_key, color_key: color_key, amount: total.to_f, pct: spent > 0 ? (total.to_f / spent * 100).round(1) : 0.0 } }

      by_type = current_user.payments
        .where(payment_date: ctx[:month_start]...ctx[:month_end])
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

      { spent: spent, categories: by_category, types: by_type }
    end

    def compute_accounts_overview(ctx)
      all_accounts = current_user.accounts.includes(:account_type).ordered
      accounts_list = all_accounts.map do |a|
        bal = ctx[:all_balances][a.id]
        { name: a.name, balance: (bal || a.balance).to_f.round(2) }
      end
      accounts_total = accounts_list.sum { |a| a[:balance] }.round(2)

      { accounts: accounts_list, total: accounts_total }
    end

    def compute_net_worth(ctx)
      net_worth_val = current_user.accounts.sum(:balance).to_f.round(2)
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

      { value: net_worth_val, change: nw_change.round(2), change_pct: nw_pct, snapshots: snapshot_data }
    end

    def compute_income_spending(ctx)
      beginning_balance = ctx[:beg_balances].select { |id, _| ctx[:budget_ids].include?(id) }.values.sum.to_f.round(2)
      expenses = current_user.payments
                             .where(account_id: ctx[:budget_accounts].select(:id))
                             .where(payment_date: ctx[:month_start]...ctx[:month_end])
                             .sum(:amount).to_f
      income = current_user.income_entries
                           .where(account_id: ctx[:budget_accounts].select(:id))
                           .where(received_flag: true)
                           .where(entry_date: ctx[:month_start]...ctx[:month_end])
                           .sum(:amount).to_f
      new_accounts = ctx[:budget_accounts]
                       .where(created_at: ctx[:month_start].beginning_of_day...ctx[:month_end].beginning_of_day)
                       .where.not(beginning_balance: 0)
                       .order(:created_at)
                       .map { |a| { name: a.name, beginning_balance: a.beginning_balance.to_f } }
      current_balance = ctx[:all_balances].select { |id, _| ctx[:budget_ids].include?(id) }.values.sum.to_f.round(2)

      { beginning_balance: beginning_balance, income: income, expenses: expenses, new_accounts: new_accounts, current_balance: current_balance }
    end

    def compute_recent_activity(ctx)
      recent = current_user.payments
                           .where(payment_date: ctx[:month_start]...ctx[:month_end])
                           .order(payment_date: :desc, sort_order: :desc)
                           .includes(:account, spending_category: :spending_type)
                           .limit(5)
                           .map { |p| { date: p.payment_date.strftime("%-m/%-d"), description: p.description, amount: p.amount.to_f } }

      { recent: recent }
    end
  end
end
