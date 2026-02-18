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

    # GET /api/reports/monthly_cash_flow?year=YYYY&month=M
    def monthly_cash_flow
      om = OpenMonthMaster.for_user(current_user)
      year  = (params[:year]  || om.current_year).to_i
      month = (params[:month] || om.current_month).to_i

      month_start = Date.new(year, month, 1)
      month_end   = month_start.next_month
      range       = month_start...month_end

      # Beginning balance = sum of all account balances as of end of prior month
      beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)
      beginning_balance = beg_balances.values.sum.to_f.round(2)

      # Deposits (inflows)
      deposits_total = current_user.income_entries
        .where(entry_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      # Payments (outflows)
      payments_total = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f.round(2)

      # Net Cash Flow
      net_cash_flow = (deposits_total - payments_total).round(2)

      # Ending Balance
      ending_balance = (beginning_balance + net_cash_flow).round(2)

      # Detail: Deposits grouped by account
      deposits_by_account = current_user.income_entries
        .joins("LEFT JOIN accounts ON accounts.id = income_entries.account_id")
        .where(entry_date: range, deleted_at: nil)
        .group("COALESCE(accounts.name, 'Unassigned')")
        .sum(:amount)
        .transform_values { |v| v.to_f.round(2) }
        .sort_by { |_, v| -v }

      # Detail: Payments grouped by category
      payments_by_category = current_user.payments
        .joins("LEFT JOIN spending_categories ON spending_categories.id = payments.spending_category_id")
        .where(payment_date: range, deleted_at: nil)
        .group("COALESCE(spending_categories.name, 'Uncategorized')")
        .sum(:amount)
        .transform_values { |v| v.to_f.round(2) }
        .sort_by { |_, v| -v }

      render json: {
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
  end
end
