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
      return unless validate_date_params!
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
      return unless validate_date_params!
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
      return unless validate_date_params!
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
      return unless validate_range_date_params!
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
      return unless validate_range_date_params!
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
      return unless validate_range_date_params!
      om = OpenMonthMaster.for_user(current_user)
      start_year  = (params[:start_year]  || om.current_year).to_i
      start_month = (params[:start_month] || 1).to_i
      end_year    = (params[:end_year]    || om.current_year).to_i
      end_month   = (params[:end_month]   || om.current_month).to_i
      in_budget_only = params[:in_budget_only] == "1"

      result = net_worth_report_data(start_year, start_month, end_year, end_month, in_budget_only)
      render json: result
    end

    # GET /api/reports/reconciliation_summary?year=YYYY&month=M&account_id=N
    def reconciliation_summary
      return unless validate_date_params!
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i
      account_id = params[:account_id].presence&.to_i

      result = reconciliation_summary_data(year, month, account_id)
      render json: result
    end

    # GET /api/reports/soft_close_summary?year=YYYY&month=M
    def soft_close_summary
      return unless validate_date_params!
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i

      result = soft_close_summary_data(year, month)
      render json: result
    end

    # GET /api/reports/recurring_obligations?year=YYYY&month=M&include_inactive=0|1
    def recurring_obligations
      return unless validate_date_params!
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i
      include_inactive = params[:include_inactive] == "1"

      result = obligations_for_month(year, month, include_inactive)
      render json: result
    end

    # GET /api/reports/spending_by_tag?year=YYYY&month=M&mode=regular|comparison&compare_prev=1&include_ytd=1
    def spending_by_tag
      return unless validate_date_params!
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i
      mode  = params[:mode] || "regular"

      current = tag_spending_for_month(year, month)
      result = current.merge(mode: mode)

      if mode == "comparison"
        if params[:compare_prev] == "1"
          prev_month_start = Date.new(year, month, 1).prev_month
          prev = tag_spending_for_month(prev_month_start.year, prev_month_start.month)
          result[:prev] = prev
          result[:variance] = compute_tag_spending_variance(current, prev)
        end

        if params[:include_ytd] == "1"
          result[:ytd] = tag_spending_ytd(year, month)
        end
      end

      render json: result
    end

    # GET /api/reports/monthly_snapshot_audit?start_year=&start_month=&end_year=&end_month=&account_id=
    def monthly_snapshot_audit
      return unless validate_range_date_params!
      om = OpenMonthMaster.for_user(current_user)
      start_year  = (params[:start_year]  || om.current_year).to_i
      start_month = (params[:start_month] || 1).to_i
      end_year    = (params[:end_year]    || om.current_year).to_i
      end_month   = (params[:end_month]   || om.current_month).to_i
      account_id  = params[:account_id].presence&.to_i

      result = snapshot_audit_data(start_year, start_month, end_year, end_month, account_id)
      render json: result
    end

    private

    def validate_date_params!
      year = params[:year]&.to_i
      month = params[:month]&.to_i
      return true unless params[:year].present? || params[:month].present?

      if (params[:month].present? && !(1..12).include?(month)) ||
         (params[:year].present? && !(2000..2100).include?(year))
        render json: { error: "Invalid date parameters" }, status: :bad_request
        return false
      end
      true
    end

    def validate_range_date_params!
      [:start_month, :end_month].each do |key|
        if params[key].present? && !(1..12).include?(params[key].to_i)
          render json: { error: "Invalid date parameters" }, status: :bad_request
          return false
        end
      end
      [:start_year, :end_year].each do |key|
        if params[key].present? && !(2000..2100).include?(params[key].to_i)
          render json: { error: "Invalid date parameters" }, status: :bad_request
          return false
        end
      end
      true
    end

    # --- Tag filtering helpers ---

    def active_tag_ids
      @active_tag_ids ||= Array(params[:tag_ids]).map(&:to_i).reject(&:zero?)
    end

    def tag_filtered_payments(scope)
      return scope if active_tag_ids.empty?
      if scope.klass == Transaction
        legacy_ids = TagAssignment.where(taggable_type: "Payment", tag_id: active_tag_ids).pluck(:taggable_id)
        txn_ids = TransactionMigrationMap.where(user_id: current_user.id, legacy_table: "payments", legacy_id: legacy_ids).pluck(:transaction_id)
        scope.where(id: txn_ids)
      else
        scope.where(id: TagAssignment.where(taggable_type: "Payment", tag_id: active_tag_ids).select(:taggable_id))
      end
    end

    def tag_filtered_income(scope)
      return scope if active_tag_ids.empty?
      if scope.klass == Transaction
        legacy_ids = TagAssignment.where(taggable_type: "IncomeEntry", tag_id: active_tag_ids).pluck(:taggable_id)
        txn_ids = TransactionMigrationMap.where(user_id: current_user.id, legacy_table: "income_entries", legacy_id: legacy_ids).pluck(:transaction_id)
        scope.where(id: txn_ids)
      else
        scope.where(id: TagAssignment.where(taggable_type: "IncomeEntry", tag_id: active_tag_ids).select(:taggable_id))
      end
    end

    def tag_names_for_response
      return [] if active_tag_ids.empty?
      current_user.tags.where(id: active_tag_ids).order(:sort_order, :name).pluck(:name, :color_key).map do |name, color_key|
        { name: name, color_key: color_key }
      end
    end

    def cash_flow_for_month(year, month)
      month_start = Date.new(year, month, 1)
      month_end   = month_start.next_month
      range       = month_start...month_end

      beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)
      beginning_balance = beg_balances.values.sum.to_f.round(2)

      income_base = tag_filtered_income(current_user.transactions.deposits.where(txn_date: range))
      payment_base = tag_filtered_payments(current_user.transactions.payments.where(txn_date: range))

      deposits_total = income_base.sum(:amount).to_f.round(2)
      payments_total = payment_base.sum(:amount).to_f.round(2)

      new_accounts = current_user.accounts
        .where(created_at: month_start.beginning_of_day...month_end.beginning_of_day)
        .where.not(beginning_balance: 0)
        .order(:created_at)
        .map { |a| { name: a.name, beginning_balance: a.beginning_balance.to_f.round(2) } }
      new_accounts_total = new_accounts.sum { |a| a[:beginning_balance] }.round(2)

      net_cash_flow = (deposits_total + new_accounts_total - payments_total).round(2)
      ending_balance = (beginning_balance + net_cash_flow).round(2)

      deposits_by_account = income_base
        .joins("LEFT JOIN accounts ON accounts.id = transactions.account_id")
        .group("COALESCE(accounts.name, 'Unassigned')")
        .sum(:amount)
        .transform_values { |v| v.to_f.round(2) }
        .sort_by { |_, v| -v }

      payments_by_category = payment_base
        .joins("LEFT JOIN spending_categories ON spending_categories.id = transactions.spending_category_id")
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
        new_accounts: new_accounts,
        new_accounts_total: new_accounts_total,
        total_payments: payments_total,
        net_cash_flow: net_cash_flow,
        ending_balance: ending_balance,
        deposits_by_account: deposits_by_account,
        payments_by_category: payments_by_category,
        applied_tags: tag_names_for_response
      }
    end

    def compute_variance(current, prev)
      fields = [:beginning_balance, :total_deposits, :new_accounts_total, :total_payments, :net_cash_flow, :ending_balance]
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

      deposits_total = tag_filtered_income(current_user.transactions.deposits
        .where(txn_date: range))
        .sum(:amount).to_f.round(2)

      payments_total = tag_filtered_payments(current_user.transactions.payments
        .where(txn_date: range))
        .sum(:amount).to_f.round(2)

      new_accounts_total = current_user.accounts
        .where(created_at: ytd_start.beginning_of_day...ytd_end.beginning_of_day)
        .where.not(beginning_balance: 0)
        .sum(:beginning_balance).to_f.round(2)

      net_cash_flow = (deposits_total + new_accounts_total - payments_total).round(2)
      ending_balance = (beginning_balance + net_cash_flow).round(2)

      {
        label: "Jan – #{Date.new(year, month, 1).strftime('%b')} #{year}",
        beginning_balance: beginning_balance,
        total_deposits: deposits_total,
        new_accounts_total: new_accounts_total,
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

      base = tag_filtered_payments(current_user.transactions.payments.where(txn_date: range))

      total_spent = base.sum(:amount).to_f.round(2)
      transaction_count = base.count

      categories = base
        .joins("LEFT JOIN spending_categories ON spending_categories.id = transactions.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_categories.id",
          "spending_categories.name",
          "spending_categories.icon_key",
          "spending_categories.color_key",
          "spending_types.name"
        )
        .order(Arel.sql("SUM(transactions.amount) DESC"))
        .pluck(
          Arel.sql("spending_categories.id"),
          Arel.sql("COALESCE(spending_categories.name, 'Uncategorized')"),
          Arel.sql("spending_categories.icon_key"),
          Arel.sql("spending_categories.color_key"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("SUM(transactions.amount)"),
          Arel.sql("COUNT(transactions.id)")
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
        categories: categories,
        applied_tags: tag_names_for_response
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

      base = tag_filtered_payments(current_user.transactions.payments.where(txn_date: range))

      total_spent = base.sum(:amount).to_f.round(2)
      transaction_count = base.count

      categories = base
        .joins("LEFT JOIN spending_categories ON spending_categories.id = transactions.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_categories.id",
          "spending_categories.name",
          "spending_categories.icon_key",
          "spending_categories.color_key",
          "spending_types.name"
        )
        .order(Arel.sql("SUM(transactions.amount) DESC"))
        .pluck(
          Arel.sql("spending_categories.id"),
          Arel.sql("COALESCE(spending_categories.name, 'Uncategorized')"),
          Arel.sql("spending_categories.icon_key"),
          Arel.sql("spending_categories.color_key"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("SUM(transactions.amount)"),
          Arel.sql("COUNT(transactions.id)")
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

      base = tag_filtered_payments(current_user.transactions.payments.where(txn_date: range))

      total_spent = base.sum(:amount).to_f.round(2)
      transaction_count = base.count

      types = base
        .joins("LEFT JOIN spending_categories ON spending_categories.id = transactions.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_types.id",
          "spending_types.name",
          "spending_types.icon_key",
          "spending_types.color_key"
        )
        .order(Arel.sql("SUM(transactions.amount) DESC"))
        .pluck(
          Arel.sql("spending_types.id"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("spending_types.icon_key"),
          Arel.sql("spending_types.color_key"),
          Arel.sql("SUM(transactions.amount)"),
          Arel.sql("COUNT(transactions.id)")
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
        types: types,
        applied_tags: tag_names_for_response
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

      base = tag_filtered_payments(current_user.transactions.payments.where(txn_date: range))

      total_spent = base.sum(:amount).to_f.round(2)
      transaction_count = base.count

      types = base
        .joins("LEFT JOIN spending_categories ON spending_categories.id = transactions.spending_category_id AND spending_categories.deleted_at IS NULL")
        .joins("LEFT JOIN spending_types ON spending_types.id = spending_categories.spending_type_id AND spending_types.deleted_at IS NULL")
        .group(
          "spending_types.id",
          "spending_types.name",
          "spending_types.icon_key",
          "spending_types.color_key"
        )
        .order(Arel.sql("SUM(transactions.amount) DESC"))
        .pluck(
          Arel.sql("spending_types.id"),
          Arel.sql("COALESCE(spending_types.name, 'None')"),
          Arel.sql("spending_types.icon_key"),
          Arel.sql("spending_types.color_key"),
          Arel.sql("SUM(transactions.amount)"),
          Arel.sql("COUNT(transactions.id)")
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
          end_balances = AccountBalanceService.balances_as_of(current_user, Date.current)

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

      scope = current_user.transactions.deposits.where(txn_date: range)
      scope = scope.where(account_id: account_id) if account_id
      scope = tag_filtered_income(scope)

      total_income = scope.sum(:amount).to_f.round(2)
      total_count = scope.count

      sources = scope
        .group(:description)
        .order(Arel.sql("SUM(amount) DESC"))
        .pluck(
          Arel.sql("description"),
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
        account_name: account_id ? (current_user.accounts.find_by(id: account_id)&.name || "Unknown") : "All Accounts",
        applied_tags: tag_names_for_response
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
          # Type-based classification: use account_type_master_id, not balance sign
          credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
          credit_acct_ids = current_user.accounts.unscoped.where(account_type_master_id: credit_ids).pluck(:id).to_set
          asset_snaps = snaps.reject { |s| credit_acct_ids.include?(s.account_id) }
          liability_snaps = snaps.select { |s| credit_acct_ids.include?(s.account_id) }
          total_assets = asset_snaps.sum { |s| s.ending_balance.to_f }.round(2)
          total_liabilities = liability_snaps.sum { |s| s.ending_balance.to_f }.round(2)
          net_worth = (total_assets + total_liabilities).round(2)
          { label: label, year: y_val, month: m_val, total_assets: total_assets, total_liabilities: total_liabilities, net_worth: net_worth, source: "snapshot" }
        elsif is_open
          # Canonical aggregator: Accounts + Assets + Investments + Financing
          nw = Account.net_worth_for(account_scope, user: current_user)
          total_assets = nw[:assets].round(2)
          total_liabilities = nw[:liabilities].round(2)
          net_worth = nw[:net_worth].round(2)
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

    # --- Reconciliation Summary helpers ---

    def reconciliation_summary_data(year, month, account_id)
      label = Date.new(year, month, 1).strftime("%B %Y")

      unless account_id
        return { exists: false, label: label, message: "Please select an account." }
      end

      account = current_user.accounts.find_by(id: account_id)
      return { exists: false, label: label, message: "Account not found." } unless account

      # Reconciliation record
      recon = current_user.reconciliation_records.find_by(
        account_id: account.id, year: year, month: month
      )

      # BudgetHQ balance: use snapshot for closed month, live for open
      om = OpenMonthMaster.for_user(current_user)
      is_open = (year == om.current_year && month == om.current_month)

      if is_open
        all_balances = AccountBalanceService.balances_as_of(current_user, Date.current)
        budget_balance = (all_balances[account.id] || 0.0).round(2)
      else
        snap = current_user.account_month_snapshots.active.find_by(account_id: account.id, year: year, month: month)
        budget_balance = snap ? snap.ending_balance.to_f.round(2) : nil
      end

      outside_balance = recon&.outside_balance&.to_f&.round(2)
      difference = (budget_balance && outside_balance) ? (budget_balance - outside_balance).round(2) : nil
      reconciled = recon&.status == "reconciled"

      summary = {
        account_name: account.name,
        label: label,
        budget_balance: budget_balance,
        outside_balance: outside_balance,
        difference: difference,
        reconciled: reconciled,
        reconciled_at: recon&.reconciled_at&.strftime("%B %d, %Y at %I:%M %p")
      }

      # Transaction detail
      month_start = Date.new(year, month, 1)
      month_end = month_start.next_month
      range = month_start...month_end

      payments = current_user.transactions.payments
        .where(account_id: account.id, txn_date: range)
        .order(txn_date: :asc, id: :asc)
        .map { |p| { date: p.txn_date.to_s, description: p.description, amount: -p.amount.to_f.round(2), type: "Payment", reconciled: p.reconciled } }

      deposits = current_user.transactions.deposits
        .where(account_id: account.id, txn_date: range)
        .order(txn_date: :asc, id: :asc)
        .map { |d| { date: d.txn_date.to_s, description: d.description, amount: d.amount.to_f.round(2), type: "Deposit", reconciled: d.reconciled } }

      transfers_out = current_user.transactions.transfers
        .where(from_account_id: account.id, txn_date: range)
        .order(txn_date: :asc, id: :asc)
        .map { |t| to_acct = Account.unscoped.find_by(id: t.to_account_id); { date: t.txn_date.to_s, description: "Transfer to #{to_acct&.name || '[Deleted]'}", amount: -t.amount.to_f.round(2), type: "Transfer", reconciled: t.reconciled } }

      transfers_in = current_user.transactions.transfers
        .where(to_account_id: account.id, txn_date: range)
        .order(txn_date: :asc, id: :asc)
        .map { |t| from_acct = Account.unscoped.find_by(id: t.from_account_id); { date: t.txn_date.to_s, description: "Transfer from #{from_acct&.name || '[Deleted]'}", amount: t.amount.to_f.round(2), type: "Transfer", reconciled: t.reconciled } }

      adjustments = current_user.balance_adjustments
        .where(account_id: account.id, adjustment_date: range)
        .order(adjustment_date: :asc, id: :asc)
        .map { |a| { date: a.adjustment_date.to_s, description: a.description, amount: a.amount.to_f.round(2), type: "Adjustment", reconciled: a.reconciled } }

      transactions = (payments + deposits + transfers_out + transfers_in + adjustments).sort_by { |t| t[:date] }

      {
        exists: true,
        label: label,
        summary: summary,
        transactions: transactions
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

      # Section 4: Net Worth (type-based classification)
      credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
      credit_acct_ids = current_user.accounts.unscoped.where(account_type_master_id: credit_ids).pluck(:id).to_set
      asset_snaps = snapshots.reject { |s| credit_acct_ids.include?(s.account_id) }
      liability_snaps = snapshots.select { |s| credit_acct_ids.include?(s.account_id) }
      total_assets = asset_snaps.sum { |s| s.ending_balance.to_f }.round(2)
      total_liabilities = liability_snaps.sum { |s| s.ending_balance.to_f }.round(2)
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

    # --- Spending by Tag helpers ---

    def tag_spending_for_month(year, month)
      month_start = Date.new(year, month, 1)
      month_end   = month_start.next_month
      range       = month_start...month_end

      base = current_user.payments.where(payment_date: range, deleted_at: nil)
        .joins("INNER JOIN tag_assignments ON tag_assignments.taggable_type = 'Payment' AND tag_assignments.taggable_id = payments.id")
        .joins("INNER JOIN tags ON tags.id = tag_assignments.tag_id AND tags.deleted_at IS NULL AND tags.user_id = payments.user_id")

      total_spent = base.sum("payments.amount").to_f.round(2)
      transaction_count = base.distinct.count("payments.id")

      tags = base
        .group("tags.id", "tags.name", "tags.color_key")
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(
          Arel.sql("tags.id"),
          Arel.sql("tags.name"),
          Arel.sql("tags.color_key"),
          Arel.sql("SUM(payments.amount)"),
          Arel.sql("COUNT(DISTINCT payments.id)")
        )
        .map do |id, name, color_key, amount, count|
          amt = amount.to_f.round(2)
          {
            id: id,
            name: name,
            color_key: color_key,
            amount: amt,
            pct: total_spent > 0 ? (amt / total_spent * 100).round(1) : 0.0,
            count: count
          }
        end

      # Also count untagged payments
      all_payments = current_user.payments.where(payment_date: range, deleted_at: nil)
      tagged_ids = TagAssignment.where(taggable_type: "Payment", taggable_id: all_payments.select(:id)).select(:taggable_id)
      untagged = all_payments.where.not(id: tagged_ids)
      untagged_total = untagged.sum(:amount).to_f.round(2)
      untagged_count = untagged.count

      if untagged_count > 0
        full_total = (total_spent + untagged_total).round(2)
        # Recalculate percentages with full total
        tags.each { |t| t[:pct] = full_total > 0 ? (t[:amount] / full_total * 100).round(1) : 0.0 }
        tags << {
          id: nil,
          name: "Untagged",
          color_key: "gray",
          amount: untagged_total,
          pct: full_total > 0 ? (untagged_total / full_total * 100).round(1) : 0.0,
          count: untagged_count
        }
        total_spent = full_total
        transaction_count = all_payments.count
      end

      {
        month_label: month_start.strftime("%B %Y"),
        year: year,
        month: month,
        total_spent: total_spent,
        transaction_count: transaction_count,
        tags: tags
      }
    end

    def compute_tag_spending_variance(current, prev)
      curr_map = current[:tags].each_with_object({}) { |t, h| h[t[:name]] = t }
      prev_map = prev[:tags].each_with_object({}) { |t, h| h[t[:name]] = t }
      all_names = (curr_map.keys + prev_map.keys).uniq

      tags = all_names.sort_by { |n| -(curr_map[n]&.dig(:amount) || 0.0) }.map do |name|
        c_amt = curr_map[name]&.dig(:amount) || 0.0
        p_amt = prev_map[name]&.dig(:amount) || 0.0
        diff = (c_amt - p_amt).round(2)
        pct = p_amt.zero? ? nil : ((diff / p_amt.abs) * 100).round(1)
        {
          name: name,
          color_key: (curr_map[name] || prev_map[name])&.dig(:color_key),
          dollar: diff,
          percent: pct
        }
      end

      total_diff = (current[:total_spent] - prev[:total_spent]).round(2)
      total_pct = prev[:total_spent].zero? ? nil : ((total_diff / prev[:total_spent].abs) * 100).round(1)

      { total: { dollar: total_diff, percent: total_pct }, tags: tags }
    end

    def tag_spending_ytd(year, month)
      ytd_start = Date.new(year, 1, 1)
      ytd_end   = Date.new(year, month, 1).next_month
      range     = ytd_start...ytd_end

      base = current_user.payments.where(payment_date: range, deleted_at: nil)
        .joins("INNER JOIN tag_assignments ON tag_assignments.taggable_type = 'Payment' AND tag_assignments.taggable_id = payments.id")
        .joins("INNER JOIN tags ON tags.id = tag_assignments.tag_id AND tags.deleted_at IS NULL AND tags.user_id = payments.user_id")

      total_spent = base.sum("payments.amount").to_f.round(2)
      transaction_count = base.distinct.count("payments.id")

      tags = base
        .group("tags.id", "tags.name", "tags.color_key")
        .order(Arel.sql("SUM(payments.amount) DESC"))
        .pluck(
          Arel.sql("tags.id"),
          Arel.sql("tags.name"),
          Arel.sql("tags.color_key"),
          Arel.sql("SUM(payments.amount)"),
          Arel.sql("COUNT(DISTINCT payments.id)")
        )
        .map do |id, name, color_key, amount, count|
          amt = amount.to_f.round(2)
          {
            id: id, name: name, color_key: color_key, amount: amt,
            pct: total_spent > 0 ? (amt / total_spent * 100).round(1) : 0.0,
            count: count
          }
        end

      # Untagged
      all_payments = current_user.payments.where(payment_date: range, deleted_at: nil)
      tagged_ids = TagAssignment.where(taggable_type: "Payment", taggable_id: all_payments.select(:id)).select(:taggable_id)
      untagged = all_payments.where.not(id: tagged_ids)
      untagged_total = untagged.sum(:amount).to_f.round(2)
      untagged_count = untagged.count

      if untagged_count > 0
        full_total = (total_spent + untagged_total).round(2)
        tags.each { |t| t[:pct] = full_total > 0 ? (t[:amount] / full_total * 100).round(1) : 0.0 }
        tags << { id: nil, name: "Untagged", color_key: "gray", amount: untagged_total, pct: full_total > 0 ? (untagged_total / full_total * 100).round(1) : 0.0, count: untagged_count }
        total_spent = full_total
        transaction_count = all_payments.count
      end

      {
        label: "Jan \u2013 #{Date.new(year, month, 1).strftime('%b')} #{year}",
        total_spent: total_spent,
        transaction_count: transaction_count,
        tags: tags
      }
    end

    # --- Monthly Snapshot Audit helpers ---

    def snapshot_audit_data(start_year, start_month, end_year, end_month, account_id)
      accounts = current_user.accounts.order(:name)
      accounts = accounts.where(id: account_id) if account_id

      start_date = Date.new(start_year, start_month, 1)
      end_date   = Date.new(end_year, end_month, -1)

      result = { accounts: [] }

      accounts.each do |acct|
        acct_data = { id: acct.id, name: acct.name, account_type: acct.account_type_master&.display_name, months: [] }

        # Iterate months in range
        current = start_date
        while current <= end_date
          y = current.year
          m = current.month
          month_start = Date.new(y, m, 1)
          month_end   = Date.new(y, m, -1)

          # Get snapshot for this month
          snapshot = current_user.account_month_snapshots
                                .where(account_id: acct.id, year: y, month: m)
                                .first

          # Get previous month's snapshot for beginning balance
          prev_date = month_start.prev_month
          prev_snapshot = current_user.account_month_snapshots
                                     .where(account_id: acct.id, year: prev_date.year, month: prev_date.month)
                                     .first

          beginning_balance = prev_snapshot&.ending_balance.to_f
          snapshot_ending = snapshot&.ending_balance.to_f

          # Gather all transactions for this account in this month
          transactions = []

          # Payments (debits from account)
          acct_payments = current_user.payments
                                     .where(account_id: acct.id)
                                     .where(payment_date: month_start..month_end)
                                     .order(:payment_date, :created_at)
          acct_payments.each do |p|
            transactions << {
              date: p.payment_date.to_s,
              type: "Payment",
              description: p.description.to_s,
              amount: -p.amount.to_f.round(2)
            }
          end

          # Deposits (credits to account)
          acct_deposits = current_user.income_entries
                                     .where(account_id: acct.id)
                                     .where(entry_date: month_start..month_end)
                                     .order(:entry_date, :created_at)
          acct_deposits.each do |d|
            transactions << {
              date: d.entry_date.to_s,
              type: "Deposit",
              description: d.description.to_s,
              amount: d.amount.to_f.round(2)
            }
          end

          # Transfers In (credits to account)
          transfers_in = current_user.transfer_masters
                                    .where(to_account_id: acct.id)
                                    .where(transfer_date: month_start..month_end)
                                    .order(:transfer_date, :created_at)
          transfers_in.each do |t|
            transactions << {
              date: t.transfer_date.to_s,
              type: "Transfer In",
              description: "From #{t.from_account&.name || 'Unknown'}",
              amount: t.amount.to_f.round(2)
            }
          end

          # Transfers Out (debits from account)
          transfers_out = current_user.transfer_masters
                                     .where(from_account_id: acct.id)
                                     .where(transfer_date: month_start..month_end)
                                     .order(:transfer_date, :created_at)
          transfers_out.each do |t|
            transactions << {
              date: t.transfer_date.to_s,
              type: "Transfer Out",
              description: "To #{t.to_account&.name || 'Unknown'}",
              amount: -t.amount.to_f.round(2)
            }
          end

          # Sort all by date
          transactions.sort_by! { |t| t[:date] }

          # Calculate running balance
          running = beginning_balance
          transactions.each do |t|
            running = (running + t[:amount]).round(2)
            t[:running_balance] = running
          end

          calculated_ending = running
          variance = (calculated_ending - snapshot_ending).round(2)

          acct_data[:months] << {
            year: y,
            month: m,
            label: Date.new(y, m, 1).strftime("%B %Y"),
            beginning_balance: beginning_balance.round(2),
            snapshot_ending_balance: snapshot_ending.round(2),
            calculated_ending_balance: calculated_ending.round(2),
            variance: variance,
            has_variance: variance.abs > 0.005,
            transactions: transactions
          }

          current = current.next_month
        end

        result[:accounts] << acct_data if acct_data[:months].any?
      end

      result
    end
  end
end
