class RebuildJaciSnapshots < ActiveRecord::Migration[7.1]
  def up
    user = User.find_by(email: "jacismith@home.net")
    unless user
      say "User jacismith@home.net not found — skipping."
      return
    end

    say "Rebuilding snapshots for user #{user.id} (#{user.email})"

    # ── 1. DATA SAFETY CHECK ──
    acct_count = user.accounts.count
    txn_count  = user.transactions.count
    say "  Accounts: #{acct_count}, Transactions: #{txn_count}"
    raise "No accounts found for Jaci — aborting" if acct_count.zero?

    # ── 2. CLEAR CORRUPT SNAPSHOT / MONTH STATE ──
    deleted_ams = AccountMonthSnapshot.where(user_id: user.id).delete_all
    deleted_dms = DashboardMonthSnapshot.where(user_id: user.id).delete_all
    deleted_nws = NetWorthSnapshot.where(user_id: user.id).delete_all
    deleted_cm  = CloseMonthMaster.where(user_id: user.id).delete_all
    deleted_om  = OpenMonthMaster.where(user_id: user.id).delete_all
    say "  Cleared: #{deleted_ams} account snapshots, #{deleted_dms} dashboard snapshots, #{deleted_nws} net worth snapshots, #{deleted_cm} close records, #{deleted_om} open month records"

    # ── 3. REBUILD EACH MONTH: JAN & FEB 2026 ──
    accounts = user.accounts.to_a
    credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id).to_set

    # Track per-account running beginning balance
    # Start from the account's original beginning_balance
    account_beginning = accounts.to_h { |a| [a.id, a.beginning_balance.to_f] }

    [[2026, 1], [2026, 2]].each do |year, month|
      month_start = Date.new(year, month, 1)
      month_end   = month_start.end_of_month

      say "  Building #{Date::MONTHNAMES[month]} #{year} snapshots..."

      # Per-account snapshots
      accounts.each do |account|
        # Only include accounts that existed by this month
        next if account.created_at.to_date > month_end

        beg_bal = account_beginning[account.id] || 0.0

        # If account was created mid-month, beginning balance is its starting balance
        if account.created_at.to_date >= month_start
          beg_bal = account.beginning_balance.to_f
        end

        # Compute net change from canonical transactions
        txn_scope = user.transactions.where(txn_date: month_start..month_end)

        deposits_in   = txn_scope.deposits.where(account_id: account.id).sum(:amount).to_f
        payments_out  = txn_scope.payments.where(account_id: account.id).sum(:amount).to_f
        transfers_in  = txn_scope.transfers.where(to_account_id: account.id).sum(:amount).to_f
        transfers_out = txn_scope.transfers.where(from_account_id: account.id).sum(:amount).to_f

        # Balance adjustments
        adjustments = user.balance_adjustments
                          .where(account_id: account.id, adjustment_date: month_start..month_end)
                          .sum(:amount).to_f

        end_bal = beg_bal + deposits_in - payments_out + transfers_in - transfers_out + adjustments

        AccountMonthSnapshot.create!(
          user_id: user.id,
          account_id: account.id,
          year: year,
          month: month,
          beginning_balance: beg_bal.round(2),
          ending_balance: end_bal.round(2),
          is_stale: false
        )

        # Carry forward: next month's beginning = this month's ending
        account_beginning[account.id] = end_bal
      end

      # Dashboard aggregated snapshot
      budget_accounts = accounts.select(&:include_in_budget)
      txn_scope = user.transactions.where(txn_date: month_start..month_end)
      total_spent  = txn_scope.payments.sum(:amount).to_f
      total_income = txn_scope.deposits.sum(:amount).to_f

      # Budget totals: DEBIT-only accounts
      debit_budget = budget_accounts.reject { |a| credit_ids.include?(a.account_type_master_id) }
      month_acct_snaps = AccountMonthSnapshot.where(user_id: user.id, year: year, month: month)

      beg_bal_total = 0.0
      end_bal_total = 0.0
      debit_budget.each do |a|
        snap = month_acct_snaps.find_by(account_id: a.id)
        next unless snap
        beg_bal_total += snap.beginning_balance.to_f
        end_bal_total += snap.ending_balance.to_f
      end

      # Net worth at month end
      nw = compute_net_worth_from_snapshots(user, accounts, credit_ids, year, month)

      DashboardMonthSnapshot.create!(
        user_id: user.id,
        year: year,
        month: month,
        total_spent: total_spent.round(2),
        total_income: total_income.round(2),
        beginning_balance: beg_bal_total.round(2),
        ending_balance: end_bal_total.round(2),
        net_worth: nw.round(2),
        is_stale: false
      )

      # Net worth snapshot for chart
      NetWorthSnapshot.create!(
        user_id: user.id,
        snapshot_date: month_end,
        amount: nw.round(2)
      ) if nw != 0

      # Close the month
      CloseMonthMaster.create!(
        user_id: user.id,
        closed_year: year,
        closed_month: month,
        closed_at: Time.current,
        closed_by_user_id: user.id
      )

      say "    #{Date::MONTHNAMES[month]}: spent=#{total_spent.round(2)}, income=#{total_income.round(2)}, net_worth=#{nw.round(2)}"
    end

    # ── 4. SET OPEN MONTH TO MARCH 2026 ──
    OpenMonthMaster.create!(
      user_id: user.id,
      current_year: 2026,
      current_month: 3,
      is_closed: false,
      has_data: false
    )
    say "  Open month set to March 2026"

    # ── 5. FIX LIVE ACCOUNT BALANCES ──
    # Ensure account.balance and account.beginning_balance match the rebuilt state.
    # account.balance should equal the computed balance through all transactions.
    # account.beginning_balance should equal the March beginning (= Feb ending).
    accounts.each do |account|
      feb_snap = AccountMonthSnapshot.find_by(user_id: user.id, account_id: account.id, year: 2026, month: 2)
      jan_snap = AccountMonthSnapshot.find_by(user_id: user.id, account_id: account.id, year: 2026, month: 1)

      # March beginning_balance = Feb ending (or Jan ending if no Feb snap, or original if neither)
      new_beginning = if feb_snap
                        feb_snap.ending_balance
                      elsif jan_snap
                        jan_snap.ending_balance
                      else
                        account.beginning_balance
                      end

      # Current balance = March beginning + March transactions (should be none if March just opened)
      march_start = Date.new(2026, 3, 1)
      march_end   = march_start.end_of_month
      march_txns  = user.transactions.where(txn_date: march_start..march_end)

      deposits_in   = march_txns.deposits.where(account_id: account.id).sum(:amount).to_f
      payments_out  = march_txns.payments.where(account_id: account.id).sum(:amount).to_f
      transfers_in  = march_txns.transfers.where(to_account_id: account.id).sum(:amount).to_f
      transfers_out = march_txns.transfers.where(from_account_id: account.id).sum(:amount).to_f
      march_adj     = user.balance_adjustments
                          .where(account_id: account.id, adjustment_date: march_start..march_end)
                          .sum(:amount).to_f

      new_balance = new_beginning.to_f + deposits_in - payments_out + transfers_in - transfers_out + march_adj

      account.update_columns(
        beginning_balance: new_beginning.to_f.round(2),
        balance: new_balance.round(2)
      )
    end
    say "  Account balances updated for March 2026"

    say "Snapshot rebuild complete for #{user.email}"
  end

  def down
    say "This migration cannot be reversed automatically."
    say "To undo, you would need a backup of the original snapshot data."
  end

  private

  # Compute net worth from account snapshots (for historical months, not live)
  def compute_net_worth_from_snapshots(user, accounts, credit_ids, year, month)
    snaps = AccountMonthSnapshot.where(user_id: user.id, year: year, month: month)

    asset_total = 0.0
    liability_total = 0.0

    snaps.each do |snap|
      acct = accounts.find { |a| a.id == snap.account_id }
      next unless acct
      if credit_ids.include?(acct.account_type_master_id)
        liability_total += snap.ending_balance.to_f
      else
        asset_total += snap.ending_balance.to_f
      end
    end

    # Note: Assets, Investments, Financing modules are live values —
    # for historical snapshots we only use account balances.
    # This matches how NetWorthSnapshot.backfill_for_user! works.
    asset_total + liability_total
  end
end
