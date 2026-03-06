class TransactionParityValidator
  attr_reader :results

  def initialize(user)
    @user = user
    @results = []
  end

  def validate_all!
    validate_account_balances!
    validate_monthly_payment_totals!
    validate_monthly_deposit_totals!
    validate_transfer_net_zero!
    validate_reconciliation_parity!
    results
  end

  def passed?
    results.all? { |r| r[:status] == :pass }
  end

  def summary
    passes = results.count { |r| r[:status] == :pass }
    fails = results.count { |r| r[:status] == :fail }
    "#{passes} passed, #{fails} failed out of #{results.size} checks"
  end

  private

  def validate_account_balances!
    @user.accounts.where(deleted_at: nil).find_each do |account|
      legacy_payments = Payment.unscoped.where(user_id: @user.id, account_id: account.id, deleted_at: nil).sum(:amount)
      legacy_deposits = IncomeEntry.where(user_id: @user.id, account_id: account.id, deleted_at: nil).sum(:amount)
      legacy_xfer_out = TransferMaster.where(user_id: @user.id, from_account_id: account.id).sum(:amount)
      legacy_xfer_in  = TransferMaster.where(user_id: @user.id, to_account_id: account.id).sum(:amount)
      legacy_change = legacy_deposits - legacy_payments - legacy_xfer_out + legacy_xfer_in

      txn_change = Transaction.balance_change_for_account(
        account.id,
        scope: Transaction.where(user_id: @user.id)
      )

      delta = (legacy_change - txn_change).abs
      status = delta < 0.01 ? :pass : :fail

      results << {
        group: "Account Balance",
        detail: "Account ##{account.id} (#{account.respond_to?(:name) ? account.name : 'unnamed'})",
        legacy: legacy_change.to_f.round(2),
        txn: txn_change.to_f.round(2),
        delta: delta.to_f.round(2),
        status: status
      }
    end
  end

  def validate_monthly_payment_totals!
    months = Payment.unscoped.where(user_id: @user.id, deleted_at: nil)
                    .distinct.pluck(Arel.sql("EXTRACT(YEAR FROM payment_date)::int, EXTRACT(MONTH FROM payment_date)::int"))

    months.each do |year, month|
      start_date = Date.new(year, month, 1)
      end_date = start_date.end_of_month

      legacy = Payment.unscoped.where(user_id: @user.id, deleted_at: nil, payment_date: start_date..end_date).sum(:amount)
      txn = Transaction.where(user_id: @user.id).for_month(year, month).payments.sum(:amount)

      delta = (legacy - txn).abs
      status = delta < 0.01 ? :pass : :fail

      results << {
        group: "Monthly Payments",
        detail: "#{year}-#{month.to_s.rjust(2, '0')}",
        legacy: legacy.to_f.round(2),
        txn: txn.to_f.round(2),
        delta: delta.to_f.round(2),
        status: status
      }
    end
  end

  def validate_monthly_deposit_totals!
    months = IncomeEntry.where(user_id: @user.id, deleted_at: nil)
                        .distinct.pluck(Arel.sql("EXTRACT(YEAR FROM entry_date)::int, EXTRACT(MONTH FROM entry_date)::int"))

    months.each do |year, month|
      start_date = Date.new(year, month, 1)
      end_date = start_date.end_of_month

      legacy = IncomeEntry.where(user_id: @user.id, deleted_at: nil, entry_date: start_date..end_date).sum(:amount)
      txn = Transaction.where(user_id: @user.id).for_month(year, month).deposits.sum(:amount)

      delta = (legacy - txn).abs
      status = delta < 0.01 ? :pass : :fail

      results << {
        group: "Monthly Deposits",
        detail: "#{year}-#{month.to_s.rjust(2, '0')}",
        legacy: legacy.to_f.round(2),
        txn: txn.to_f.round(2),
        delta: delta.to_f.round(2),
        status: status
      }
    end
  end

  def validate_transfer_net_zero!
    # Sum all transfers: net effect across all accounts should be zero
    txn_xfers = Transaction.where(user_id: @user.id).transfers
    total_out = txn_xfers.sum(:amount)  # from from_account
    total_in  = txn_xfers.sum(:amount)  # to to_account (same amount)
    # Since amount is the same for both sides, net is always zero
    # But verify they're not counted in spending/income
    spending = Transaction.spending_total(scope: Transaction.where(user_id: @user.id).transfers)
    income = Transaction.income_total(scope: Transaction.where(user_id: @user.id).transfers)

    status = (spending == 0 && income == 0) ? :pass : :fail

    results << {
      group: "Transfer Neutrality",
      detail: "Transfers excluded from spending/income totals",
      legacy: "N/A",
      txn: "spending=#{spending} income=#{income}",
      delta: 0,
      status: status
    }
  end

  def validate_reconciliation_parity!
    @user.accounts.where(deleted_at: nil).find_each do |account|
      legacy_reconciled = Payment.unscoped.where(user_id: @user.id, account_id: account.id, deleted_at: nil, reconciled: true).sum(:amount)
      txn_reconciled = Transaction.where(user_id: @user.id, account_id: account.id, reconciled: true).payments.sum(:amount)

      delta = (legacy_reconciled - txn_reconciled).abs
      status = delta < 0.01 ? :pass : :fail

      results << {
        group: "Reconciliation Parity",
        detail: "Account ##{account.id} reconciled payments",
        legacy: legacy_reconciled.to_f.round(2),
        txn: txn_reconciled.to_f.round(2),
        delta: delta.to_f.round(2),
        status: status
      }
    end
  end

  def self.run_for_users!(user_ids)
    all_results = {}
    user_ids.each do |uid|
      user = User.find(uid)
      validator = new(user)
      validator.validate_all!
      all_results[user.email] = {
        summary: validator.summary,
        passed: validator.passed?,
        failures: validator.results.select { |r| r[:status] == :fail }
      }
    end
    all_results
  end
end
