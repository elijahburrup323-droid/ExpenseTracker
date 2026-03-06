module LedgerMath
  extend ActiveSupport::Concern

  # Ledger Math & Sign Convention for the Transaction Engine
  #
  # AMOUNT CONVENTION:
  #   All amounts are stored as POSITIVE numbers. Direction is determined by txn_type:
  #   - payment:  outflow (subtract from account balance)
  #   - deposit:  inflow  (add to account balance)
  #   - transfer: move from from_account to to_account
  #
  # TRANSFER NEUTRALITY:
  #   Transfers NEVER count as spending or income.
  #
  # BUCKET RULE:
  #   Buckets are virtual allocations — they do NOT affect ledger balances.
  #
  # SOFT DELETE:
  #   Soft-deleted transactions (deleted_at set) are excluded from all calculations.

  class_methods do
    # Compute the net balance change for an account from transactions.
    #   + deposits into the account
    #   - payments from the account
    #   - transfers out (from_account)
    #   + transfers in  (to_account)
    def balance_change_for_account(account_id, scope: all)
      deposits_in    = scope.deposits.where(account_id: account_id).sum(:amount)
      payments_out   = scope.payments.where(account_id: account_id).sum(:amount)
      transfers_out  = scope.transfers.where(from_account_id: account_id).sum(:amount)
      transfers_in   = scope.transfers.where(to_account_id: account_id).sum(:amount)

      deposits_in - payments_out - transfers_out + transfers_in
    end

    # Spending total for a date range (payments only — transfers excluded).
    def spending_total(scope: all)
      scope.payments.sum(:amount)
    end

    # Income total for a date range (deposits only — transfers excluded).
    def income_total(scope: all)
      scope.deposits.sum(:amount)
    end

    # Scoped to a specific month.
    def for_month(year, month)
      start_date = Date.new(year, month, 1)
      end_date = start_date.end_of_month
      where(txn_date: start_date..end_date)
    end
  end
end
