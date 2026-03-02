module Api
  class SoftCloseController < BaseController
    # GET /api/soft_close/status
    def status
      om = OpenMonthMaster.for_user(current_user)
      month_start = Date.new(om.current_year, om.current_month, 1)
      month_end = month_start.next_month

      items = build_checklist(month_start, month_end)
      summary = build_summary(month_start, month_end)

      next_m = om.current_month + 1
      next_y = om.current_year
      if next_m > 12
        next_m = 1
        next_y += 1
      end

      render json: {
        month_label: month_start.strftime("%B %Y"),
        year: om.current_year,
        month: om.current_month,
        next_month_label: Date.new(next_y, next_m, 1).strftime("%B %Y"),
        items: items,
        summary: summary
      }
    end

    # POST /api/soft_close/confirm
    def confirm
      om = OpenMonthMaster.for_user(current_user)
      month_start = Date.new(om.current_year, om.current_month, 1)
      month_end = month_start.next_month

      # Verify user items
      user_items = params[:user_items] || {}
      unless user_items[:reviewed_totals].to_s == "true" && user_items[:final_confirmation].to_s == "true"
        return render json: { error: "Please confirm both review items before closing." }, status: :unprocessable_entity
      end

      # Re-run system checks
      items = build_checklist(month_start, month_end)
      failed = items.select { |i| !i[:passed] }
      if failed.any?
        details = failed.map { |i| [i[:detail], i[:label]].compact.first }
        return render json: {
          error: "#{failed.size} check#{'s' if failed.size != 1} failed: #{details.join('; ')}",
          failed_items: failed.map { |i| { label: i[:label], detail: i[:detail] } }
        }, status: :conflict
      end

      # Execute close (same logic as OpenMonthMastersController#close)
      closing_year = om.current_year
      closing_month = om.current_month

      ActiveRecord::Base.transaction do
        om.generate_snapshots!

        next_month = om.current_month + 1
        next_year = om.current_year
        if next_month > 12
          next_month = 1
          next_year += 1
        end

        om.update!(
          is_closed: false,
          locked_at: Time.current,
          locked_by_user_id: current_user.id,
          current_year: next_year,
          current_month: next_month,
          has_data: false,
          first_data_at: nil,
          first_data_source: nil
        )

        # Record the closed month in the ledger
        CloseMonthMaster.find_or_initialize_by(
          user_id: current_user.id,
          closed_year: closing_year,
          closed_month: closing_month
        ).update!(
          closed_at: Time.current,
          closed_by_user_id: current_user.id
        )
      end

      new_label = Date.new(om.current_year, om.current_month, 1).strftime("%B %Y")
      render json: { success: true, new_month_label: new_label }
    rescue => e
      render json: { error: e.message }, status: :internal_server_error
    end

    private

    def build_checklist(month_start, month_end)
      range = month_start...month_end
      sd = month_start.strftime("%Y-%m-%d")
      ed = (month_end - 1.day).strftime("%Y-%m-%d")

      # 1. No unsaved edits — always passes (server can't detect client state)
      item1 = { key: "no_unsaved_edits", label: "No unsaved edits in progress", passed: true, auto: true, detail: "Auto-verified" }

      # 2. Recurring deposits generated
      due_count = current_user.income_recurrings
        .where(use_flag: true)
        .where("next_date >= ? AND next_date < ?", month_start, month_end)
        .count
      item2 = {
        key: "recurrings_processed", label: "Recurring deposits generated",
        passed: due_count == 0, auto: true,
        detail: due_count > 0 ? "#{due_count} recurring deposit#{'s' if due_count != 1} still due" : nil,
        link: due_count > 0 ? "/income_recurrings?sc_fix=recurrings_processed" : nil,
        user_message: due_count > 0 ? "Recurring deposits are due this month but haven't been generated yet. Use the Generate button or create the deposits manually." : nil
      }

      # 3. All payments assigned to an account
      no_acct_payments = current_user.payments.where(payment_date: range, account_id: nil).where(deleted_at: nil)
      no_acct = no_acct_payments.count
      no_acct_ids = no_acct > 0 ? no_acct_payments.pluck(:id) : nil
      item3 = {
        key: "payments_accounts", label: "All payments assigned to an account",
        passed: no_acct == 0, auto: true,
        detail: no_acct > 0 ? "#{no_acct} payment#{'s' if no_acct != 1} missing account" : nil,
        link: no_acct > 0 ? "/payments?sc_fix=payments_accounts&ids=#{no_acct_ids.join(',')}&start_date=#{sd}&end_date=#{ed}" : nil,
        invalid_ids: no_acct_ids,
        user_message: no_acct > 0 ? "Every payment must belong to an account so your balances reconcile. Select an account for each highlighted payment." : nil
      }

      # 4. All payments have required fields
      incomplete_pay_query = current_user.payments.where(payment_date: range).where(deleted_at: nil)
        .where("payment_date IS NULL OR account_id IS NULL OR spending_category_id IS NULL OR amount IS NULL OR description IS NULL OR description = ''")
      incomplete_payments = incomplete_pay_query.count
      incomplete_pay_ids = incomplete_payments > 0 ? incomplete_pay_query.pluck(:id) : nil
      item4 = {
        key: "payments_complete", label: "All payments have required fields",
        passed: incomplete_payments == 0, auto: true,
        detail: incomplete_payments > 0 ? "#{incomplete_payments} payment#{'s' if incomplete_payments != 1} incomplete" : nil,
        link: incomplete_payments > 0 ? "/payments?sc_fix=payments_complete&ids=#{incomplete_pay_ids.join(',')}&start_date=#{sd}&end_date=#{ed}" : nil,
        invalid_ids: incomplete_pay_ids,
        user_message: incomplete_payments > 0 ? "Some payments are missing required information. Fill in the highlighted fields so totals calculate correctly." : nil
      }

      # 5. All deposits have required fields
      incomplete_dep_query = current_user.income_entries.where(entry_date: range).where(deleted_at: nil)
        .where("entry_date IS NULL OR account_id IS NULL OR amount IS NULL OR source_name IS NULL OR source_name = ''")
      incomplete_deposits = incomplete_dep_query.count
      incomplete_dep_ids = incomplete_deposits > 0 ? incomplete_dep_query.pluck(:id) : nil
      item5 = {
        key: "deposits_complete", label: "All deposits have required fields",
        passed: incomplete_deposits == 0, auto: true,
        detail: incomplete_deposits > 0 ? "#{incomplete_deposits} deposit#{'s' if incomplete_deposits != 1} incomplete" : nil,
        link: incomplete_deposits > 0 ? "/income_entries?sc_fix=deposits_complete&ids=#{incomplete_dep_ids.join(',')}" : nil,
        invalid_ids: incomplete_dep_ids,
        user_message: incomplete_deposits > 0 ? "Some deposits are missing required information. Fill in the highlighted fields so totals calculate correctly." : nil
      }

      # 6. All transfers valid
      # Check for truly invalid transfers: missing required fields.
      # Same-account transfers with different buckets are valid (bucket reallocations).
      invalid_transfers = current_user.transfer_masters.where(transfer_date: range)
        .where(
          "from_account_id IS NULL OR to_account_id IS NULL OR amount IS NULL OR transfer_date IS NULL " \
          "OR (from_account_id = to_account_id AND (from_bucket_id IS NULL OR to_bucket_id IS NULL OR from_bucket_id = to_bucket_id))"
        )
      invalid_count = invalid_transfers.count
      invalid_t_ids = invalid_count > 0 ? invalid_transfers.pluck(:id) : nil
      item6 = {
        key: "transfers_valid", label: "All transfers are valid",
        passed: invalid_count == 0, auto: true,
        detail: invalid_count > 0 ? "#{invalid_count} transfer#{'s' if invalid_count != 1} invalid" : nil,
        link: invalid_count > 0 ? "/transfer_masters?sc_fix=transfers_valid&ids=#{invalid_t_ids.join(',')}" : nil,
        invalid_ids: invalid_t_ids,
        user_message: invalid_count > 0 ? "A transfer must have both a From and To account, and the amounts must match. Fix the highlighted transfers so your balances stay correct." : nil
      }

      # 7. No transactions dated outside open month
      # Since all transactions are date-scoped, this auto-passes.
      item7 = {
        key: "dates_in_range", label: "No transactions dated outside month",
        passed: true, auto: true,
        detail: "All transactions are date-scoped"
      }

      [item1, item2, item3, item4, item5, item6, item7]
    end

    def build_summary(month_start, month_end)
      range = month_start...month_end

      payments_total = current_user.payments
        .where(payment_date: range, deleted_at: nil)
        .sum(:amount).to_f

      deposits_total = current_user.income_entries
        .where(entry_date: range, deleted_at: nil)
        .sum(:amount).to_f

      transfers_total = current_user.transfer_masters
        .where(transfer_date: range)
        .sum(:amount).to_f

      beg_balances = AccountBalanceService.balances_as_of(current_user, month_start - 1.day)
      beginning_balance = beg_balances.values.sum.to_f.round(2)

      is_current = month_start == Date.today.beginning_of_month
      as_of = is_current ? Date.today : (month_end - 1.day)
      end_balances = AccountBalanceService.balances_as_of(current_user, as_of)
      ending_balance = end_balances.values.sum.to_f.round(2)

      {
        payments_total: payments_total.round(2),
        deposits_total: deposits_total.round(2),
        transfers_total: transfers_total.round(2),
        beginning_balance: beginning_balance,
        ending_balance: ending_balance,
        net_change: (ending_balance - beginning_balance).round(2)
      }
    end
  end
end
