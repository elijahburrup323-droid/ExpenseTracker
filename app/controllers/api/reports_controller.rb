module Api
  class ReportsController < ApplicationController
    before_action :authenticate_user!

    # GET /api/reports/layout
    def layout
      UserReportLayout.seed_defaults_for(current_user)

      slots = current_user.user_report_layouts.order(:slot_number).map do |slot|
        defn = slot.definition
        {
          slot_number: slot.slot_number,
          report_key: slot.report_key,
          title: defn&.title,
          category: defn&.category,
          description: defn&.description,
          icon_key: defn&.icon_key
        }
      end

      render json: { slots: slots }
    end

    # PUT /api/reports/reorder
    def reorder
      UserReportLayout.seed_defaults_for(current_user)

      assignments = params.require(:slots)
      ActiveRecord::Base.transaction do
        # Delete all and recreate to avoid unique constraint violations during swap
        current_user.user_report_layouts.delete_all

        assignments.each do |assignment|
          current_user.user_report_layouts.create!(
            slot_number: assignment[:slot_number],
            report_key: assignment[:report_key]
          )
        end
      end
      render json: { success: true }
    rescue ActiveRecord::RecordNotFound => e
      render json: { error: e.message }, status: :not_found
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # GET /api/reports/monthly_cash_flow?year=YYYY&month=M&mode=regular|comparison&compare_prev=1&include_ytd=1
    def monthly_cash_flow
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i
      mode  = params[:mode] || "regular"

      current = cash_flow_for_month(year, month)

      result = current.merge(mode: mode)

      if mode == "comparison"
        if params[:compare_prev] == "1"
          prev_month_start = Date.new(year, month, 1).prev_month
          prev = cash_flow_for_month(prev_month_start.year, prev_month_start.month)
          result[:prev] = prev
          result[:variance] = compute_variance(current, prev)
        end

        if params[:include_ytd] == "1"
          result[:ytd] = cash_flow_ytd(year, month)
        end
      end

      render json: result
    end

    # GET /api/reports/spending_by_category?year=YYYY&month=M&mode=regular|comparison&compare_prev=1&include_ytd=1
    def spending_by_category
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i
      mode  = params[:mode] || "regular"

      current = spending_for_month(year, month)
      result = current.merge(mode: mode)

      if mode == "comparison"
        if params[:compare_prev] == "1"
          prev_month_start = Date.new(year, month, 1).prev_month
          prev = spending_for_month(prev_month_start.year, prev_month_start.month)
          result[:prev] = prev
          result[:variance] = compute_spending_variance(current, prev)
        end

        if params[:include_ytd] == "1"
          result[:ytd] = spending_ytd(year, month)
        end
      end

      render json: result
    end

    # GET /api/reports/spending_by_type?year=YYYY&month=M&mode=regular|comparison&compare_prev=1&include_ytd=1
    def spending_by_type
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i
      mode  = params[:mode] || "regular"

      current = type_spending_for_month(year, month)
      result = current.merge(mode: mode)

      if mode == "comparison"
        if params[:compare_prev] == "1"
          prev_month_start = Date.new(year, month, 1).prev_month
          prev = type_spending_for_month(prev_month_start.year, prev_month_start.month)
          result[:prev] = prev
          result[:variance] = compute_type_spending_variance(current, prev)
        end

        if params[:include_ytd] == "1"
          result[:ytd] = type_spending_ytd(year, month)
        end
      end

      render json: result
    end

    # GET /api/reports/account_balance_history?account_id=&start_year=&start_month=&end_year=&end_month=&closed_only=0|1
    def account_balance_history
      om = OpenMonthMaster.for_user(current_user)
      account_id  = params[:account_id].presence&.to_i
      start_year  = (params[:start_year]  || om.current_year).to_i
      start_month = (params[:start_month] || 1).to_i
      end_year    = (params[:end_year]    || om.current_year).to_i
      end_month   = (params[:end_month]   || om.current_month).to_i
      closed_only = params[:closed_only] == "1"

      result = balance_history(account_id, start_year, start_month, end_year, end_month, closed_only, om)
      render json: result
    end

    # GET /api/reports/income_by_source?start_year=&start_month=&end_year=&end_month=&account_id=&include_recurring=0|1
    def income_by_source
      om = OpenMonthMaster.for_user(current_user)
      start_year  = (params[:start_year]  || om.current_year).to_i
      start_month = (params[:start_month] || 1).to_i
      end_year    = (params[:end_year]    || om.current_year).to_i
      end_month   = (params[:end_month]   || om.current_month).to_i
      account_id  = params[:account_id].presence&.to_i
      include_recurring = params[:include_recurring] != "0"

      result = income_by_source_data(start_year, start_month, end_year, end_month, account_id, include_recurring)
      render json: result
    end

    # GET /api/reports/net_worth_report?start_year=&start_month=&end_year=&end_month=&in_budget_only=0|1
    def net_worth_report
      om = OpenMonthMaster.for_user(current_user)
      start_year  = (params[:start_year]  || om.current_year).to_i
      start_month = (params[:start_month] || 1).to_i
      end_year    = (params[:end_year]    || om.current_year).to_i
      end_month   = (params[:end_month]   || om.current_month).to_i
      in_budget_only = params[:in_budget_only] == "1"

      result = net_worth_report_data(start_year, start_month, end_year, end_month, in_budget_only)
      render json: result
    end

    # GET /api/reports/soft_close_summary?year=YYYY&month=M
    def soft_close_summary
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i

      result = soft_close_summary_data(year, month)
      render json: result
    end

    # GET /api/reports/recurring_obligations?year=YYYY&month=M&include_inactive=0|1
    def recurring_obligations
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i
      include_inactive = params[:include_inactive] == "1"

      result = obligations_for_month(year, month, include_inactive)
      render json: result
    end

    private

    def cash_flow_for_month(year, month)
      month_start = Date.new(year, month, 1)
      month_end   = month_start.next_month
      range       = month_start...month_end

      beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)
      beginning_balance = beg_balances.values.sum.to_f.round(2)

      deposits_total = current_user.income_entries
        .where(entry_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      payments_total = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      net_cash_flow = (deposits_total - payments_total).round(2)
      ending_balance = (beginning_balance + net_cash_flow).round(2)

      deposits_by_account = current_user.income_entries
        .joins("LEFT JOIN accounts ON accounts.id = income_entries.account_id")
        .where(entry_date: range, deleted_at: nil)
        .group("COALESCE(accounts.name, 'Unassigned')")
        .sum(:amount)
        .transform_values { |v| v.to_f.round(2) }
        .sort_by { |_, v| -v }

      payments_by_category = current_user.payments
        .joins("LEFT JOIN spending_categories ON spending_categories.id = payments.spending_category_id")
        .where(payment_date: range, deleted_at: nil)
        .group("COALESCE(spending_categories.name, 'Uncategorized')")
        .sum(:amount)
        .transform_values { |v| v.to_f.round(2) }
        .sort_by { |_, v| -v }

      {
        month_label: month_start.strftime("%B %Y"),
        year: year,
        month: month,
        beginning_balance: beginning_balance,
        total_deposits: deposits_total,
        total_payments: payments_total,
        net_cash_flow: net_cash_flow,
        ending_balance: ending_balance,
        deposits_by_account: deposits_by_account,
        payments_by_category: payments_by_category
      }
    end

    def compute_variance(current, prev)
      fields = [:beginning_balance, :total_deposits, :total_payments, :net_cash_flow, :ending_balance]
      result = {}
      fields.each do |f|
        c = current[f].to_f
        p = prev[f].to_f
        diff = (c - p).round(2)
        pct = p.zero? ? nil : ((diff / p.abs) * 100).round(1)
        result[f] = { dollar: diff, percent: pct }
      end
      result
    end

    def cash_flow_ytd(year, month)
      ytd_start = Date.new(year, 1, 1)
      ytd_end   = Date.new(year, month, 1).next_month
      range     = ytd_start...ytd_end

      beg_balances = AccountBalanceService.balances_as_of(current_user, ytd_start - 1.day)
      beginning_balance = beg_balances.values.sum.to_f.round(2)

      deposits_total = current_user.income_entries
        .where(entry_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      payments_total = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      net_cash_flow = (deposits_total - payments_total).round(2)
      ending_balance = (beginning_balance + net_cash_flow).round(2)

      {
        label: "Jan – #{Date.new(year, month, 1).strftime('%b')} #{year}",
        beginning_balance: beginning_balance,
        total_deposits: deposits_total,
        total_payments: payments_total,
        net_cash_flow: net_cash_flow,
        ending_balance: ending_balance
      }
    end

    # --- Spending by Category helpers ---

    def spending_for_month(year, month)
      month_start = Date.new(year, month, 1)
      month_end   = month_start.next_month
      range       = month_start...month_end

      total_spent = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      transaction_count = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .count

      categories = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .joins("LEFT JOIN spending_categories ON spending_categories.id = payments.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_categories.id",
          "spending_categories.name",
          "spending_categories.icon_key",
          "spending_categories.color_key",
          "spending_types.name"
        )
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(
          Arel.sql("spending_categories.id"),
          Arel.sql("COALESCE(spending_categories.name, 'Uncategorized')"),
          Arel.sql("spending_categories.icon_key"),
          Arel.sql("spending_categories.color_key"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("SUM(payments.amount)"),
          Arel.sql("COUNT(payments.id)")
        )
        .map do |id, name, icon_key, color_key, spending_type, amount, count|
          amt = amount.to_f.round(2)
          {
            id: id,
            name: name,
            icon_key: icon_key,
            color_key: color_key,
            spending_type: spending_type,
            amount: amt,
            pct: total_spent > 0 ? (amt / total_spent * 100).round(1) : 0.0,
            count: count
          }
        end

      {
        month_label: month_start.strftime("%B %Y"),
        year: year,
        month: month,
        total_spent: total_spent,
        transaction_count: transaction_count,
        categories: categories
      }
    end

    def compute_spending_variance(current, prev)
      curr_map = current[:categories].each_with_object({}) { |c, h| h[c[:name]] = c }
      prev_map = prev[:categories].each_with_object({}) { |c, h| h[c[:name]] = c }
      all_names = (curr_map.keys + prev_map.keys).uniq

      categories = all_names.sort_by { |n| -(curr_map[n]&.dig(:amount) || 0.0) }.map do |name|
        c_amt = curr_map[name]&.dig(:amount) || 0.0
        p_amt = prev_map[name]&.dig(:amount) || 0.0
        diff = (c_amt - p_amt).round(2)
        pct = p_amt.zero? ? nil : ((diff / p_amt.abs) * 100).round(1)
        {
          name: name,
          icon_key: (curr_map[name] || prev_map[name])&.dig(:icon_key),
          color_key: (curr_map[name] || prev_map[name])&.dig(:color_key),
          dollar: diff,
          percent: pct
        }
      end

      total_diff = (current[:total_spent] - prev[:total_spent]).round(2)
      total_pct = prev[:total_spent].zero? ? nil : ((total_diff / prev[:total_spent].abs) * 100).round(1)

      { total: { dollar: total_diff, percent: total_pct }, categories: categories }
    end

    def spending_ytd(year, month)
      ytd_start = Date.new(year, 1, 1)
      ytd_end   = Date.new(year, month, 1).next_month
      range     = ytd_start...ytd_end

      total_spent = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      transaction_count = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .count

      categories = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .joins("LEFT JOIN spending_categories ON spending_categories.id = payments.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_categories.id",
          "spending_categories.name",
          "spending_categories.icon_key",
          "spending_categories.color_key",
          "spending_types.name"
        )
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(
          Arel.sql("spending_categories.id"),
          Arel.sql("COALESCE(spending_categories.name, 'Uncategorized')"),
          Arel.sql("spending_categories.icon_key"),
          Arel.sql("spending_categories.color_key"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("SUM(payments.amount)"),
          Arel.sql("COUNT(payments.id)")
        )
        .map do |id, name, icon_key, color_key, spending_type, amount, count|
          amt = amount.to_f.round(2)
          {
            id: id, name: name, icon_key: icon_key, color_key: color_key,
            spending_type: spending_type, amount: amt,
            pct: total_spent > 0 ? (amt / total_spent * 100).round(1) : 0.0,
            count: count
          }
        end

      {
        label: "Jan \u2013 #{Date.new(year, month, 1).strftime('%b')} #{year}",
        total_spent: total_spent,
        transaction_count: transaction_count,
        categories: categories
      }
    end

    # --- Spending by Type helpers ---

    def type_spending_for_month(year, month)
      month_start = Date.new(year, month, 1)
      month_end   = month_start.next_month
      range       = month_start...month_end

      total_spent = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      transaction_count = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .count

      types = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .joins("LEFT JOIN spending_categories ON spending_categories.id = payments.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_types.id",
          "spending_types.name",
          "spending_types.icon_key",
          "spending_types.color_key"
        )
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(
          Arel.sql("spending_types.id"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("spending_types.icon_key"),
          Arel.sql("spending_types.color_key"),
          Arel.sql("SUM(payments.amount)"),
          Arel.sql("COUNT(payments.id)")
        )
        .map do |id, name, icon_key, color_key, amount, count|
          amt = amount.to_f.round(2)
          {
            id: id,
            name: name,
            icon_key: icon_key,
            color_key: color_key,
            amount: amt,
            pct: total_spent > 0 ? (amt / total_spent * 100).round(1) : 0.0,
            count: count
          }
        end

      {
        month_label: month_start.strftime("%B %Y"),
        year: year,
        month: month,
        total_spent: total_spent,
        transaction_count: transaction_count,
        types: types
      }
    end

    def compute_type_spending_variance(current, prev)
      curr_map = current[:types].each_with_object({}) { |t, h| h[t[:name]] = t }
      prev_map = prev[:types].each_with_object({}) { |t, h| h[t[:name]] = t }
      all_names = (curr_map.keys + prev_map.keys).uniq

      types = all_names.sort_by { |n| -(curr_map[n]&.dig(:amount) || 0.0) }.map do |name|
        c_amt = curr_map[name]&.dig(:amount) || 0.0
        p_amt = prev_map[name]&.dig(:amount) || 0.0
        diff = (c_amt - p_amt).round(2)
        pct = p_amt.zero? ? nil : ((diff / p_amt.abs) * 100).round(1)
        {
          name: name,
          icon_key: (curr_map[name] || prev_map[name])&.dig(:icon_key),
          color_key: (curr_map[name] || prev_map[name])&.dig(:color_key),
          dollar: diff,
          percent: pct
        }
      end

      total_diff = (current[:total_spent] - prev[:total_spent]).round(2)
      total_pct = prev[:total_spent].zero? ? nil : ((total_diff / prev[:total_spent].abs) * 100).round(1)

      { total: { dollar: total_diff, percent: total_pct }, types: types }
    end

    def type_spending_ytd(year, month)
      ytd_start = Date.new(year, 1, 1)
      ytd_end   = Date.new(year, month, 1).next_month
      range     = ytd_start...ytd_end

      total_spent = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      transaction_count = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .count

      types = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .joins("LEFT JOIN spending_categories ON spending_categories.id = payments.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_types.id",
          "spending_types.name",
          "spending_types.icon_key",
          "spending_types.color_key"
        )
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(
          Arel.sql("spending_types.id"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("spending_types.icon_key"),
          Arel.sql("spending_types.color_key"),
          Arel.sql("SUM(payments.amount)"),
          Arel.sql("COUNT(payments.id)")
        )
        .map do |id, name, icon_key, color_key, amount, count|
          amt = amount.to_f.round(2)
          {
            id: id, name: name, icon_key: icon_key, color_key: color_key,
            amount: amt,
            pct: total_spent > 0 ? (amt / total_spent * 100).round(1) : 0.0,
            count: count
          }
        end

      {
        label: "Jan \u2013 #{Date.new(year, month, 1).strftime('%b')} #{year}",
        total_spent: total_spent,
        transaction_count: transaction_count,
        types: types
      }
    end

    # --- Account Balance History helpers ---

    def balance_history(account_id, start_year, start_month, end_year, end_month, closed_only, om)
      # Build month list (max 60)
      months = []
      d = Date.new(start_year, start_month, 1)
      end_d = Date.new(end_year, end_month, 1)
      while d <= end_d && months.size < 60
        months << { year: d.year, month: d.month }
        d = d.next_month
      end

      open_year = om.current_year
      open_month = om.current_month

      # Determine account name for display
      account_name = "All Accounts"
      if account_id
        acct = current_user.accounts.find_by(id: account_id)
        account_name = acct&.name || "Unknown Account"
      end

      # Preload all snapshots in range for efficiency
      snapshot_scope = current_user.account_month_snapshots.active.includes(:account)
      snapshot_scope = snapshot_scope.where(account_id: account_id) if account_id
      all_snapshots = snapshot_scope.where(
        "(year > :sy OR (year = :sy AND month >= :sm)) AND (year < :ey OR (year = :ey AND month <= :em))",
        sy: start_year, sm: start_month, ey: end_year, em: end_month
      ).to_a

      # Group snapshots by (year, month)
      snapshots_by_period = all_snapshots.group_by { |s| [s.year, s.month] }

      rows = months.map do |m|
        y, mo = m[:year], m[:month]
        is_open = (y == open_year && mo == open_month)
        is_closed = (y < open_year || (y == open_year && mo < open_month))

        # Skip open month if closed_only
        next nil if closed_only && is_open
        # Skip future months
        next nil if !is_open && !is_closed

        label = Date.new(y, mo, 1).strftime("%B %Y")

        if is_closed
          snaps = snapshots_by_period[[y, mo]] || []
          if snaps.empty?
            { label: label, year: y, month: mo, beginning_balance: nil, ending_balance: nil, change: nil, source: "no_data" }
          else
            beg = snaps.sum { |s| s.beginning_balance.to_f }.round(2)
            ending = snaps.sum { |s| s.ending_balance.to_f }.round(2)
            { label: label, year: y, month: mo, beginning_balance: beg, ending_balance: ending, change: (ending - beg).round(2), source: "snapshot" }
          end
        elsif is_open
          month_start = Date.new(y, mo, 1)
          beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)
          end_balances = AccountBalanceService.balances_as_of(current_user, Date.today)

          if account_id
            beg = (beg_balances[account_id] || 0.0).round(2)
            ending = (end_balances[account_id] || 0.0).round(2)
          else
            beg = beg_balances.values.sum.to_f.round(2)
            ending = end_balances.values.sum.to_f.round(2)
          end

          { label: label, year: y, month: mo, beginning_balance: beg, ending_balance: ending, change: (ending - beg).round(2), source: "live" }
        end
      end.compact

      {
        account_name: account_name,
        account_id: account_id,
        start_label: Date.new(start_year, start_month, 1).strftime("%B %Y"),
        end_label: Date.new(end_year, end_month, 1).strftime("%B %Y"),
        months: rows
      }
    end

    # --- Income by Source helpers ---

    def income_by_source_data(start_year, start_month, end_year, end_month, account_id, include_recurring)
      range_start = Date.new(start_year, start_month, 1)
      range_end   = Date.new(end_year, end_month, 1).next_month
      range       = range_start...range_end

      scope = current_user.income_entries.where(entry_date: range, deleted_at: nil)
      scope = scope.where(account_id: account_id) if account_id
      scope = scope.where(income_recurring_id: nil) unless include_recurring

      total_income = scope.sum(:amount).to_f.round(2)
      total_count = scope.count

      sources = scope
        .group(:source_name)
        .order(Arel.sql("SUM(amount) DESC"))
        .pluck(
          Arel.sql("source_name"),
          Arel.sql("SUM(amount)"),
          Arel.sql("COUNT(*)")
        )
        .map do |name, amount, count|
          amt = amount.to_f.round(2)
          {
            name: name,
            amount: amt,
            count: count,
            pct: total_income > 0 ? (amt / total_income * 100).round(1) : 0.0
          }
        end

      {
        sources: sources,
        total_income: total_income,
        total_count: total_count,
        start_label: range_start.strftime("%B %Y"),
        end_label: Date.new(end_year, end_month, 1).strftime("%B %Y"),
        account_name: account_id ? (current_user.accounts.find_by(id: account_id)&.name || "Unknown") : "All Accounts"
      }
    end

    # --- Net Worth Report helpers ---

    def net_worth_report_data(start_year, start_month, end_year, end_month, in_budget_only)
      om = OpenMonthMaster.for_user(current_user)
      open_year  = om.current_year
      open_month = om.current_month

      # Build month list
      months = []
      y, m = start_year, start_month
      while y < end_year || (y == end_year && m <= end_month)
        months << { year: y, month: m }
        m += 1
        if m > 12
          m = 1
          y += 1
        end
      end

      # Determine which accounts to include
      account_scope = current_user.accounts
      account_scope = account_scope.where(include_in_budget: true) if in_budget_only
      account_ids = account_scope.pluck(:id).to_set

      # Preload all account_month_snapshots for the range
      all_snapshots = current_user.account_month_snapshots.active
        .where(
          "(year > :sy OR (year = :sy AND month >= :sm)) AND (year < :ey OR (year = :ey AND month <= :em))",
          sy: start_year, sm: start_month, ey: end_year, em: end_month
        ).to_a
      snapshots_by_period = all_snapshots.group_by { |s| [s.year, s.month] }

      rows = months.map do |mo|
        y_val, m_val = mo[:year], mo[:month]
        is_open = (y_val == open_year && m_val == open_month)
        is_closed = (y_val < open_year || (y_val == open_year && m_val < open_month))

        next nil if !is_open && !is_closed

        label = Date.new(y_val, m_val, 1).strftime("%B %Y")

        if is_closed
          snaps = (snapshots_by_period[[y_val, m_val]] || []).select { |s| account_ids.include?(s.account_id) }
          total_assets = snaps.select { |s| s.ending_balance.to_f >= 0 }.sum { |s| s.ending_balance.to_f }.round(2)
          total_liabilities = snaps.select { |s| s.ending_balance.to_f < 0 }.sum { |s| s.ending_balance.to_f }.round(2)
          net_worth = (total_assets + total_liabilities).round(2)
          { label: label, year: y_val, month: m_val, total_assets: total_assets, total_liabilities: total_liabilities, net_worth: net_worth, source: "snapshot" }
        elsif is_open
          balances = AccountBalanceService.balances_as_of(current_user, Date.today)
          filtered = balances.select { |aid, _| account_ids.include?(aid) }
          total_assets = filtered.values.select { |v| v >= 0 }.sum.to_f.round(2)
          total_liabilities = filtered.values.select { |v| v < 0 }.sum.to_f.round(2)
          net_worth = (total_assets + total_liabilities).round(2)
          { label: label, year: y_val, month: m_val, total_assets: total_assets, total_liabilities: total_liabilities, net_worth: net_worth, source: "live" }
        end
      end.compact

      # Compute month-over-month change
      rows.each_with_index do |row, i|
        if i == 0
          row[:change] = nil
        else
          row[:change] = (row[:net_worth] - rows[i - 1][:net_worth]).round(2)
        end
      end

      {
        start_label: Date.new(start_year, start_month, 1).strftime("%B %Y"),
        end_label: Date.new(end_year, end_month, 1).strftime("%B %Y"),
        in_budget_only: in_budget_only,
        months: rows
      }
    end

    # --- Soft Close Summary helpers ---

    def soft_close_summary_data(year, month)
      label = Date.new(year, month, 1).strftime("%B %Y")

      # Check if month was closed
      close_record = current_user.close_month_masters.find_by(closed_year: year, closed_month: month)
      unless close_record
        return { exists: false, label: label, message: "No soft close snapshot exists for this month." }
      end

      # Section 1: Month Overview
      overview = {
        label: label,
        closed_at: close_record.closed_at&.strftime("%B %d, %Y at %I:%M %p"),
        closed_by: close_record.closed_by_user&.email || "System"
      }

      # Section 2: Account Balances (from account_month_snapshots)
      snapshots = current_user.account_month_snapshots.active
        .where(year: year, month: month)
        .includes(:account)
        .order("accounts.sort_order")
      accounts = snapshots.map do |s|
        beg = s.beginning_balance.to_f.round(2)
        ending = s.ending_balance.to_f.round(2)
        {
          name: s.account&.name || "Deleted Account",
          beginning_balance: beg,
          ending_balance: ending,
          change: (ending - beg).round(2)
        }
      end

      # Section 3: Income & Spending (from dashboard_month_snapshot)
      dash_snap = current_user.dashboard_month_snapshots.active.for_period(year, month).first
      income_spending = if dash_snap
        {
          total_deposits: dash_snap.total_income.to_f.round(2),
          total_payments: dash_snap.total_spent.to_f.round(2),
          beginning_balance: dash_snap.beginning_balance.to_f.round(2),
          ending_balance: dash_snap.ending_balance.to_f.round(2)
        }
      end

      # Section 4: Net Worth (from snapshots)
      total_assets = snapshots.select { |s| s.ending_balance.to_f >= 0 }.sum { |s| s.ending_balance.to_f }.round(2)
      total_liabilities = snapshots.select { |s| s.ending_balance.to_f < 0 }.sum { |s| s.ending_balance.to_f }.round(2)
      net_worth_val = (total_assets + total_liabilities).round(2)

      {
        exists: true,
        label: label,
        overview: overview,
        accounts: accounts,
        income_spending: income_spending,
        net_worth: {
          total_assets: total_assets,
          total_liabilities: total_liabilities,
          net_worth: net_worth_val
        }
      }
    end

    # --- Recurring Obligations helpers ---

    def obligations_for_month(year, month, include_inactive)
      month_start = Date.new(year, month, 1)

      scope = current_user.recurring_obligations.ordered
      scope = scope.active unless include_inactive

      obligations = scope
        .includes(:account, :frequency_master, spending_category: :spending_type)
        .select { |ob| ob.falls_in_month?(year, month) }

      rows = obligations.map do |ob|
        due = ob.due_date_in_month(year, month)
        {
          id: ob.id,
          due_date: due&.strftime("%Y-%m-%d"),
          due_day_display: due&.strftime("%b %d"),
          name: ob.name,
          description: ob.description,
          account_name: ob.account&.name || "Unassigned",
          category_name: ob.spending_category&.name || "Uncategorized",
          icon_key: ob.spending_category&.icon_key,
          color_key: ob.spending_category&.color_key,
          spending_type_name: ob.spending_category&.spending_type&.name || "None",
          frequency_name: ob.frequency_master.name,
          amount: ob.amount.to_f.round(2),
          status: "Scheduled",
          use_flag: ob.use_flag,
          notes: ob.notes
        }
      end.sort_by { |r| r[:due_date] || "9999-12-31" }

      total_amount = rows.sum { |r| r[:amount] }

      {
        month_label: month_start.strftime("%B %Y"),
        year: year,
        month: month,
        total_obligations: rows.size,
        total_expected: total_amount.round(2),
        obligations: rows
      }
    end
  end
end
