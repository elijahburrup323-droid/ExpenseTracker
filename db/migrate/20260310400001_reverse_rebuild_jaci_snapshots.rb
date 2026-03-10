class ReverseRebuildJaciSnapshots < ActiveRecord::Migration[7.1]
  def up
    user = User.find_by(email: "jacismith@home.net")
    unless user
      say "User jacismith@home.net not found — skipping."
      return
    end

    say "=== REVERSE Snapshot Rebuild for user #{user.id} (#{user.email}) ==="

    # ── STEP 1: VERIFY SYSTEM STATE ──
    accounts = user.accounts.to_a
    raise "No accounts found for Jaci — aborting" if accounts.empty?

    txn_count = user.transactions.count
    say "  Accounts: #{accounts.size}, Transactions: #{txn_count}"

    # ── STEP 2: CAPTURE CURRENT ACCOUNT BALANCES (before deleting anything) ──
    current_balances = accounts.to_h { |a| [a.id, a.balance.to_f] }
    say "  Current balances captured: #{current_balances.map { |id, b| "#{Account.find(id).name}=#{b.round(2)}" }.join(', ')}"

    # ── STEP 3: BUILD MASTER TRANSACTION LEDGER ──
    # Unified ledger: for each account, group transactions by month
    # amount_change = +deposits -payments +transfers_in -transfers_out +adjustments

    # ── STEP 4: IDENTIFY MONTH BOUNDARIES ──
    earliest_txn = user.transactions.minimum(:txn_date)
    latest_txn   = user.transactions.maximum(:txn_date)

    unless earliest_txn
      say "  No transactions found — creating single open month snapshot."
      return
    end

    # Build list of months from earliest to latest transaction
    months = []
    cursor = Date.new(earliest_txn.year, earliest_txn.month, 1)
    limit  = Date.new(latest_txn.year, latest_txn.month, 1)
    while cursor <= limit
      months << [cursor.year, cursor.month]
      cursor = cursor.next_month
    end

    # Ensure current open month (March 2026) is included even if no transactions yet
    open_month = [2026, 3]
    months << open_month unless months.include?(open_month)

    say "  Month boundaries: #{months.map { |y, m| "#{Date::MONTHNAMES[m]} #{y}" }.join(', ')}"

    # ── STEP 5: COMPUTE NET CHANGE PER ACCOUNT PER MONTH ──
    # net_change[account_id][month_key] = net amount change
    net_changes = {}
    accounts.each { |a| net_changes[a.id] = {} }

    months.each do |year, month|
      month_start = Date.new(year, month, 1)
      month_end   = month_start.end_of_month
      txn_scope   = user.transactions.where(txn_date: month_start..month_end)

      accounts.each do |account|
        deposits_in   = txn_scope.deposits.where(account_id: account.id).sum(:amount).to_f
        payments_out  = txn_scope.payments.where(account_id: account.id).sum(:amount).to_f
        transfers_in  = txn_scope.transfers.where(to_account_id: account.id).sum(:amount).to_f
        transfers_out = txn_scope.transfers.where(from_account_id: account.id).sum(:amount).to_f
        adjustments   = user.balance_adjustments
                            .where(account_id: account.id, adjustment_date: month_start..month_end)
                            .sum(:amount).to_f

        net = deposits_in - payments_out + transfers_in - transfers_out + adjustments
        net_changes[account.id][[year, month]] = net
      end
    end

    # ── STEP 6: REVERSE CALCULATE — work backward from current balance ──
    # For each account:
    #   ending_balance[last_month] = current_balance
    #   beginning_balance[month] = ending_balance[month] - net_change[month]
    #   ending_balance[prev_month] = beginning_balance[month]  (carry backward)

    # snapshots[account_id][[year,month]] = { beginning: X, ending: Y }
    snapshots = {}
    accounts.each do |account|
      snapshots[account.id] = {}
      ending = current_balances[account.id]

      # Walk months in REVERSE order
      months.reverse.each do |year, month|
        net = net_changes[account.id][[year, month]] || 0.0
        beginning = ending - net
        snapshots[account.id][[year, month]] = {
          beginning: beginning.round(2),
          ending: ending.round(2)
        }
        # The beginning of this month = ending of previous month
        ending = beginning
      end
    end

    # ── STEP 7: VALIDATION — verify beginning + net = ending for every cell ──
    validation_errors = []
    accounts.each do |account|
      months.each do |year, month|
        snap = snapshots[account.id][[year, month]]
        net  = net_changes[account.id][[year, month]] || 0.0
        expected_ending = (snap[:beginning] + net).round(2)
        if expected_ending != snap[:ending]
          validation_errors << "#{account.name} #{Date::MONTHNAMES[month]} #{year}: " \
            "beg=#{snap[:beginning]} + net=#{net.round(2)} = #{expected_ending}, but ending=#{snap[:ending]}"
        end
      end
    end

    if validation_errors.any?
      validation_errors.each { |e| say "  VALIDATION FAIL: #{e}" }
      raise "Snapshot validation failed — aborting. #{validation_errors.size} errors."
    end
    say "  Validation passed: all months balance correctly."

    # ── STEP 8: CLEAR EXISTING SNAPSHOT / MONTH STATE ──
    deleted_ams = AccountMonthSnapshot.where(user_id: user.id).delete_all
    deleted_dms = DashboardMonthSnapshot.where(user_id: user.id).delete_all
    deleted_nws = NetWorthSnapshot.where(user_id: user.id).delete_all
    deleted_cm  = CloseMonthMaster.where(user_id: user.id).delete_all
    deleted_om  = OpenMonthMaster.where(user_id: user.id).delete_all
    say "  Cleared: #{deleted_ams} account snaps, #{deleted_dms} dashboard snaps, #{deleted_nws} NW snaps, #{deleted_cm} close records, #{deleted_om} open month records"

    # ── STEP 9: INSERT SNAPSHOTS ──
    credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id).to_set

    months.each do |year, month|
      month_start = Date.new(year, month, 1)
      month_end   = month_start.end_of_month
      is_open_month = (year == open_month[0] && month == open_month[1])

      # Per-account snapshots
      accounts.each do |account|
        snap = snapshots[account.id][[year, month]]
        next unless snap

        AccountMonthSnapshot.create!(
          user_id: user.id,
          account_id: account.id,
          year: year,
          month: month,
          beginning_balance: snap[:beginning],
          ending_balance: snap[:ending],
          is_stale: false
        )
      end

      # Dashboard aggregated snapshot
      budget_accounts = accounts.select(&:include_in_budget)
      txn_scope    = user.transactions.where(txn_date: month_start..month_end)
      total_spent  = txn_scope.payments.sum(:amount).to_f
      total_income = txn_scope.deposits.sum(:amount).to_f

      debit_budget = budget_accounts.reject { |a| credit_ids.include?(a.account_type_master_id) }
      beg_bal_total = debit_budget.sum { |a| snapshots[a.id].dig([year, month], :beginning) || 0.0 }
      end_bal_total = debit_budget.sum { |a| snapshots[a.id].dig([year, month], :ending) || 0.0 }

      nw = compute_net_worth_from_snapshots(accounts, credit_ids, snapshots, year, month)

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

      NetWorthSnapshot.create!(
        user_id: user.id,
        snapshot_date: month_end,
        amount: nw.round(2)
      ) if nw != 0

      # ── STEP 10: CLOSE COMPLETED MONTHS (not the open month) ──
      unless is_open_month
        CloseMonthMaster.create!(
          user_id: user.id,
          closed_year: year,
          closed_month: month,
          closed_at: Time.current,
          closed_by_user_id: user.id
        )
      end

      say "    #{Date::MONTHNAMES[month]} #{year}: spent=#{total_spent.round(2)}, income=#{total_income.round(2)}, NW=#{nw.round(2)}#{is_open_month ? ' (OPEN)' : ' (CLOSED)'}"
    end

    # ── STEP 11: SET OPEN MONTH ──
    OpenMonthMaster.create!(
      user_id: user.id,
      current_year: open_month[0],
      current_month: open_month[1],
      is_closed: false,
      has_data: user.transactions.where(
        txn_date: Date.new(open_month[0], open_month[1], 1)..Date.new(open_month[0], open_month[1], 1).end_of_month
      ).exists?
    )
    say "  Open month set to #{Date::MONTHNAMES[open_month[1]]} #{open_month[0]}"

    # ── STEP 12: UPDATE LIVE ACCOUNT BALANCES ──
    # beginning_balance = open month's beginning (from snapshot)
    # balance = current_balance (unchanged — this is our source of truth)
    accounts.each do |account|
      open_snap = snapshots[account.id][open_month]
      next unless open_snap

      account.update_columns(
        beginning_balance: open_snap[:beginning],
        balance: current_balances[account.id].round(2)
      )
    end
    say "  Account beginning_balance updated for #{Date::MONTHNAMES[open_month[1]]} #{open_month[0]}"

    say "=== Reverse snapshot rebuild complete for #{user.email} ==="
  end

  def down
    say "This migration cannot be reversed automatically."
    say "To undo, you would need a backup of the original snapshot data."
  end

  private

  def compute_net_worth_from_snapshots(accounts, credit_ids, snapshots, year, month)
    asset_total = 0.0
    liability_total = 0.0

    accounts.each do |acct|
      snap = snapshots[acct.id][[year, month]]
      next unless snap

      if credit_ids.include?(acct.account_type_master_id)
        liability_total += snap[:ending]
      else
        asset_total += snap[:ending]
      end
    end

    asset_total + liability_total
  end
end
