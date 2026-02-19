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
  end
end
