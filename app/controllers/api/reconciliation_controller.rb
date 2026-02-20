module Api
  class ReconciliationController < BaseController
    # GET /api/reconciliation/data?account_id=X&year=Y&month=M
    def data
      account = current_user.accounts.find_by(id: params[:account_id])
      return render_not_found unless account

      # Force to current open month only (no month navigation)
      om = OpenMonthMaster.for_user(current_user)
      year = om.current_year
      month = om.current_month
      month_start = Date.new(year, month, 1)
      month_end = month_start.next_month
      range = month_start...month_end

      # BudgetHQ balance for this account as of month end
      as_of = month_end - 1.day
      all_balances = AccountBalanceService.balances_as_of(current_user, as_of)
      budget_balance = (all_balances[account.id] || 0.0).round(2)

      # Reconciliation record
      recon = current_user.reconciliation_records.find_by(
        account_id: account.id, year: year, month: month
      )

      # Payments for this account/month
      payments = current_user.payments
        .where(account_id: account.id, payment_date: range)
        .order(payment_date: :asc, id: :asc)
        .map do |p|
          {
            id: p.id, type: "payment",
            date: p.payment_date, payee: p.description,
            amount: p.amount.to_f, notes: p.notes,
            reconciled: p.reconciled
          }
        end

      # Deposits for this account/month
      deposits = current_user.income_entries
        .where(account_id: account.id, entry_date: range)
        .order(entry_date: :asc, id: :asc)
        .map do |d|
          {
            id: d.id, type: "deposit",
            date: d.entry_date, source: d.source_name,
            amount: d.amount.to_f, notes: d.description,
            reconciled: d.reconciled
          }
        end

      # Transfers touching this account/month
      transfers_out = current_user.transfer_masters
        .where(from_account_id: account.id, transfer_date: range)
        .order(transfer_date: :asc, id: :asc)
        .map do |t|
          to_acct = current_user.accounts.unscoped.find_by(id: t.to_account_id)
          {
            id: t.id, type: "transfer",
            date: t.transfer_date,
            description: "To #{to_acct&.name || '[Deleted]'}",
            amount: -t.amount.to_f, memo: t.memo,
            reconciled: t.reconciled
          }
        end

      transfers_in = current_user.transfer_masters
        .where(to_account_id: account.id, transfer_date: range)
        .order(transfer_date: :asc, id: :asc)
        .map do |t|
          from_acct = current_user.accounts.unscoped.find_by(id: t.from_account_id)
          {
            id: t.id, type: "transfer",
            date: t.transfer_date,
            description: "From #{from_acct&.name || '[Deleted]'}",
            amount: t.amount.to_f, memo: t.memo,
            reconciled: t.reconciled
          }
        end

      all_transfers = (transfers_out + transfers_in).sort_by { |t| [t[:date], t[:id]] }

      # Balance adjustments for this account/month
      adjustments = current_user.balance_adjustments
        .where(account_id: account.id, adjustment_date: range)
        .order(adjustment_date: :asc, id: :asc)
        .map do |a|
          {
            id: a.id, type: "adjustment",
            date: a.adjustment_date, description: a.description,
            amount: a.amount.to_f, notes: a.notes,
            reconciled: a.reconciled
          }
        end

      # Always current month, never read-only
      is_read_only = false

      render json: {
        account: { id: account.id, name: account.name, icon_key: account.icon_key, color_key: account.color_key },
        budget_balance: budget_balance,
        outside_balance: recon&.outside_balance&.to_f,
        statement_counts: {
          payments: recon&.statement_payment_count || 0,
          deposits: recon&.statement_deposit_count || 0,
          adjustments: recon&.statement_adjustment_count || 0
        },
        recon_status: recon&.status || "open",
        payments: payments,
        deposits: deposits,
        transfers: all_transfers,
        adjustments: adjustments,
        unreconciled: {
          payments: payments.count { |p| !p[:reconciled] },
          deposits: deposits.count { |d| !d[:reconciled] },
          transfers: all_transfers.count { |t| !t[:reconciled] },
          adjustments: adjustments.count { |a| !a[:reconciled] }
        },
        totals: {
          payments: payments.sum { |p| p[:amount] }.round(2),
          deposits: deposits.sum { |d| d[:amount] }.round(2),
          transfers: all_transfers.sum { |t| t[:amount] }.round(2),
          adjustments: adjustments.sum { |a| a[:amount] }.round(2)
        },
        month_label: month_start.strftime("%B %Y"),
        year: year,
        month: month,
        is_read_only: is_read_only
      }
    rescue ArgumentError
      render json: { error: "Invalid date parameters" }, status: :bad_request
    end

    # PATCH /api/reconciliation/toggle
    def toggle
      type = params[:type]
      id = params[:id]
      reconciled = params[:reconciled]

      record = case type
               when "payment"
                 current_user.payments.find_by(id: id)
               when "deposit"
                 current_user.income_entries.find_by(id: id)
               when "transfer"
                 current_user.transfer_masters.find_by(id: id)
               when "adjustment"
                 current_user.balance_adjustments.find_by(id: id)
               end

      return render_not_found unless record

      record.update!(reconciled: reconciled)
      render json: { success: true, reconciled: record.reconciled }
    end

    # PUT /api/reconciliation/outside_balance
    def save_outside_balance
      account = current_user.accounts.find_by(id: params[:account_id])
      return render_not_found unless account

      om = OpenMonthMaster.for_user(current_user)
      recon = current_user.reconciliation_records.find_or_initialize_by(
        account_id: account.id,
        year: om.current_year,
        month: om.current_month
      )
      recon.outside_balance = params[:outside_balance]
      recon.save!

      render json: { success: true, outside_balance: recon.outside_balance.to_f }
    end

    # PUT /api/reconciliation/statement_counts
    def save_statement_counts
      account = current_user.accounts.find_by(id: params[:account_id])
      return render_not_found unless account

      om = OpenMonthMaster.for_user(current_user)
      recon = current_user.reconciliation_records.find_or_initialize_by(
        account_id: account.id,
        year: om.current_year,
        month: om.current_month
      )
      recon.statement_payment_count = params[:payment_count].to_i if params[:payment_count]
      recon.statement_deposit_count = params[:deposit_count].to_i if params[:deposit_count]
      recon.statement_adjustment_count = params[:adjustment_count].to_i if params[:adjustment_count]
      recon.save!

      render json: { success: true }
    end

    # GET /api/reconciliation/group_states?account_id=X
    def group_states
      account = current_user.accounts.find_by(id: params[:account_id])
      return render_not_found unless account

      om = OpenMonthMaster.for_user(current_user)
      states = ReconciliationGroupUiState.where(
        user_id: current_user.id,
        account_id: account.id,
        year: om.current_year,
        month: om.current_month
      )

      result = {}
      states.each { |s| result[s.group_type] = s.is_collapsed }
      render json: result
    end

    # PUT /api/reconciliation/toggle_group
    def toggle_group
      account = current_user.accounts.find_by(id: params[:account_id])
      return render_not_found unless account

      group_type = params[:group_type]
      unless ReconciliationGroupUiState::VALID_GROUP_TYPES.include?(group_type)
        return render json: { error: "Invalid group_type" }, status: :unprocessable_entity
      end

      om = OpenMonthMaster.for_user(current_user)
      state = ReconciliationGroupUiState.find_or_initialize_by(
        user_id: current_user.id,
        account_id: account.id,
        year: om.current_year,
        month: om.current_month,
        group_type: group_type
      )
      state.is_collapsed = params[:is_collapsed]
      state.save!

      render json: { success: true, is_collapsed: state.is_collapsed }
    end

    # GET /api/reconciliation/diagnostics?account_id=X
    def diagnostics
      account = current_user.accounts.find_by(id: params[:account_id])
      return render_not_found unless account

      om = OpenMonthMaster.for_user(current_user)
      year = om.current_year
      month = om.current_month
      month_start = Date.new(year, month, 1)
      month_end = month_start.next_month
      range = month_start...month_end

      # Calculate difference
      as_of = month_end - 1.day
      all_balances = AccountBalanceService.balances_as_of(current_user, as_of)
      budget_balance = (all_balances[account.id] || 0.0).round(2)
      recon = current_user.reconciliation_records.find_by(
        account_id: account.id, year: year, month: month
      )
      outside = recon&.outside_balance.to_f.round(2)
      diff = (outside - budget_balance).round(2)

      suggestions = { count_issues: [], amount_issues: [], cross_account: [] }

      if diff == 0.0
        return render json: suggestions
      end

      abs_diff = diff.abs

      # Gather transactions
      payments = current_user.payments.where(account_id: account.id, payment_date: range)
      deposits = current_user.income_entries.where(account_id: account.id, entry_date: range)
      transfers_out = current_user.transfer_masters.where(from_account_id: account.id, transfer_date: range)
      transfers_in = current_user.transfer_masters.where(to_account_id: account.id, transfer_date: range)
      adjustments = current_user.balance_adjustments.where(account_id: account.id, adjustment_date: range)

      stmt_payment_count = recon&.statement_payment_count || 0
      stmt_deposit_count = recon&.statement_deposit_count || 0

      # --- STEP 1: COUNT DIAGNOSTICS ---

      if stmt_payment_count > 0 && stmt_payment_count != payments.count
        suggestions[:count_issues] << {
          type: "count_mismatch",
          category: "payments",
          message: "Statement has #{stmt_payment_count} payments but BudgetHQ has #{payments.count}.",
          severity: "warning"
        }
      end

      if stmt_deposit_count > 0 && stmt_deposit_count != deposits.count
        suggestions[:count_issues] << {
          type: "count_mismatch",
          category: "deposits",
          message: "Statement has #{stmt_deposit_count} deposits but BudgetHQ has #{deposits.count}.",
          severity: "warning"
        }
      end

      # Single missing transaction: diff matches one unreconciled transaction
      unreconciled_payments = payments.where(reconciled: false)
      unreconciled_deposits = deposits.where(reconciled: false)

      unreconciled_payments.each do |p|
        if (p.amount.to_f.round(2) - abs_diff).abs < 0.005
          suggestions[:count_issues] << {
            type: "single_match",
            category: "payments",
            message: "Payment '#{p.description}' ($#{p.amount.to_f.round(2)}) on #{p.payment_date} matches the difference exactly.",
            record_id: p.id, record_type: "payment", severity: "info"
          }
        end
      end

      unreconciled_deposits.each do |d|
        if (d.amount.to_f.round(2) - abs_diff).abs < 0.005
          suggestions[:count_issues] << {
            type: "single_match",
            category: "deposits",
            message: "Deposit '#{d.source_name}' ($#{d.amount.to_f.round(2)}) on #{d.entry_date} matches the difference exactly.",
            record_id: d.id, record_type: "deposit", severity: "info"
          }
        end
      end

      # Detect duplicates: same date + amount + description
      payment_groups = payments.group_by { |p| [p.payment_date, p.amount.to_f.round(2), p.description&.downcase&.strip] }
      payment_groups.each do |key, group|
        if group.size > 1
          suggestions[:count_issues] << {
            type: "duplicate",
            category: "payments",
            message: "#{group.size} duplicate payments: '#{group.first.description}' $#{key[1]} on #{key[0]} — possible double entry.",
            record_ids: group.map(&:id), record_type: "payment", severity: "warning"
          }
        end
      end

      deposit_groups = deposits.group_by { |d| [d.entry_date, d.amount.to_f.round(2), d.source_name&.downcase&.strip] }
      deposit_groups.each do |key, group|
        if group.size > 1
          suggestions[:count_issues] << {
            type: "duplicate",
            category: "deposits",
            message: "#{group.size} duplicate deposits: '#{group.first.source_name}' $#{key[1]} on #{key[0]} — possible double entry.",
            record_ids: group.map(&:id), record_type: "deposit", severity: "warning"
          }
        end
      end

      # Subset matching (max 3 combinations): check if 2-3 unreconciled transactions sum to the difference
      unrec_amounts = unreconciled_payments.map { |p| { amount: p.amount.to_f.round(2), label: "Payment '#{p.description}'", id: p.id, type: "payment" } }
      unrec_amounts += unreconciled_deposits.map { |d| { amount: d.amount.to_f.round(2), label: "Deposit '#{d.source_name}'", id: d.id, type: "deposit" } }

      if unrec_amounts.size >= 2 && unrec_amounts.size <= 20
        unrec_amounts.combination(2).each do |combo|
          total = combo.sum { |c| c[:amount] }
          if (total - abs_diff).abs < 0.005
            labels = combo.map { |c| c[:label] }.join(" + ")
            suggestions[:count_issues] << {
              type: "subset_match",
              message: "#{labels} sum to the difference ($#{abs_diff}).",
              severity: "info"
            }
            break # Only show first match
          end
        end

        if unrec_amounts.size >= 3
          unrec_amounts.combination(3).first(100).each do |combo|
            total = combo.sum { |c| c[:amount] }
            if (total - abs_diff).abs < 0.005
              labels = combo.map { |c| c[:label] }.join(" + ")
              suggestions[:count_issues] << {
                type: "subset_match",
                message: "#{labels} sum to the difference ($#{abs_diff}).",
                severity: "info"
              }
              break
            end
          end
        end
      end

      # --- STEP 2: AMOUNT DIAGNOSTICS ---

      # Transposition: if abs(diff) is divisible by 9
      if abs_diff > 0 && (abs_diff * 100).round % 9 == 0
        suggestions[:amount_issues] << {
          type: "transposition",
          message: "Difference of $#{abs_diff} is divisible by 9 — possible digit transposition in an entry.",
          severity: "warning"
        }
      end

      # Decimal shift
      all_amounts = payments.pluck(:amount).map { |a| a.to_f.round(2) } + deposits.pluck(:amount).map { |a| a.to_f.round(2) }
      all_amounts.each do |amt|
        next if amt == 0
        [10, 100].each do |factor|
          if (amt * factor - abs_diff).abs < 0.005 || (amt / factor - abs_diff).abs < 0.005
            suggestions[:amount_issues] << {
              type: "decimal_shift",
              message: "A transaction of $#{amt} could be a decimal shift error (×#{factor} or ÷#{factor} = $#{abs_diff}).",
              severity: "info"
            }
          end
        end
      end

      # Sign error: diff equals 2× a transaction (deposit entered as payment or vice versa)
      all_amounts.each do |amt|
        if (2 * amt - abs_diff).abs < 0.005
          suggestions[:amount_issues] << {
            type: "sign_error",
            message: "Difference of $#{abs_diff} equals 2× a $#{amt} transaction — possible sign error (deposit entered as payment or vice versa).",
            severity: "warning"
          }
        end
      end

      # Bank fee / interest: small unexplained difference
      if abs_diff < 25.0
        suggestions[:amount_issues] << {
          type: "bank_fee",
          message: "Small difference of $#{abs_diff} — could be a bank fee, service charge, or interest not yet entered.",
          severity: "info"
        }
      end

      # --- STEP 3: CROSS-ACCOUNT SCAN ---

      other_accounts = current_user.accounts.where.not(id: account.id)
      tolerance_start = month_start - 3.days
      tolerance_end = month_end + 3.days
      tolerance_range = tolerance_start...tolerance_end

      other_accounts.each do |other_acct|
        # Check payments in other accounts matching the difference
        matching_payments = current_user.payments
          .where(account_id: other_acct.id, payment_date: tolerance_range)
          .where("ABS(CAST(amount AS DECIMAL(12,2)) - ?) < 0.005", abs_diff)
          .limit(3)

        matching_payments.each do |mp|
          suggestions[:cross_account] << {
            type: "wrong_account",
            category: "payments",
            message: "Payment '#{mp.description}' $#{mp.amount.to_f.round(2)} on #{mp.payment_date} in '#{other_acct.name}' matches the difference — possible wrong account entry.",
            record_id: mp.id, account_name: other_acct.name, severity: "info"
          }
        end

        # Check deposits in other accounts
        matching_deposits = current_user.income_entries
          .where(account_id: other_acct.id, entry_date: tolerance_range)
          .where("ABS(CAST(amount AS DECIMAL(12,2)) - ?) < 0.005", abs_diff)
          .limit(3)

        matching_deposits.each do |md|
          suggestions[:cross_account] << {
            type: "wrong_account",
            category: "deposits",
            message: "Deposit '#{md.source_name}' $#{md.amount.to_f.round(2)} on #{md.entry_date} in '#{other_acct.name}' matches the difference — possible wrong account entry.",
            record_id: md.id, account_name: other_acct.name, severity: "info"
          }
        end

        break if suggestions[:cross_account].size >= 5
      end

      render json: suggestions
    end

    # PUT /api/reconciliation/mark_reconciled
    def mark_reconciled
      account = current_user.accounts.find_by(id: params[:account_id])
      return render_not_found unless account

      om = OpenMonthMaster.for_user(current_user)
      year = om.current_year
      month = om.current_month

      recon = current_user.reconciliation_records.find_or_initialize_by(
        account_id: account.id, year: year, month: month
      )

      # Verify difference is zero
      month_start = Date.new(year, month, 1)
      month_end = month_start.next_month
      range = month_start...month_end
      as_of = month_end - 1.day
      all_balances = AccountBalanceService.balances_as_of(current_user, as_of)
      budget_balance = (all_balances[account.id] || 0.0).round(2)
      outside = recon.outside_balance.to_f.round(2)
      diff = (outside - budget_balance).round(2)

      if diff != 0.0
        return render json: { error: "Cannot mark as reconciled. Difference is #{diff}." }, status: :unprocessable_entity
      end

      ActiveRecord::Base.transaction do
        # Mark all transactions for this account/month as reconciled
        current_user.payments
          .where(account_id: account.id, payment_date: range)
          .update_all(reconciled: true)

        current_user.income_entries
          .where(account_id: account.id, entry_date: range)
          .update_all(reconciled: true)

        current_user.transfer_masters
          .where(from_account_id: account.id, transfer_date: range)
          .or(current_user.transfer_masters.where(to_account_id: account.id, transfer_date: range))
          .update_all(reconciled: true)

        current_user.balance_adjustments
          .where(account_id: account.id, adjustment_date: range)
          .update_all(reconciled: true)

        # Update header record
        recon.update!(
          status: "reconciled",
          reconciled_at: Time.current,
          reconciled_by: current_user.id
        )
      end

      render json: { success: true, status: "reconciled" }
    end
  end
end
