class TransactionEngine
  CLASSIFICATION_FIELDS = %i[spending_category_id spending_type_id description memo reconciled cleared].freeze
  FINANCIAL_FIELDS = %i[amount account_id from_account_id to_account_id txn_date].freeze

  class << self
    # ── Create ───────────────────────────────────────────────

    def create_payment!(user, attrs)
      create_transaction!(user, attrs.merge(txn_type: "payment"))
    end

    def create_deposit!(user, attrs)
      create_transaction!(user, attrs.merge(txn_type: "deposit"))
    end

    def create_transfer!(user, attrs)
      create_transaction!(user, attrs.merge(txn_type: "transfer"))
    end

    def create_transaction!(user, attrs)
      attrs = normalize_attrs(attrs)
      txn = user.transactions.create!(attrs)
      flag_open_month(user, txn.txn_date, "transaction_create")
      txn
    end

    # ── Update ───────────────────────────────────────────────

    def update_transaction!(user, transaction_id, attrs)
      txn = find_transaction!(user, transaction_id)
      attrs = normalize_attrs(attrs)

      if month_closed?(user, txn.txn_date)
        enforce_classification_only!(attrs)
      end

      txn.update!(attrs)
      txn
    end

    # ── Soft Delete ──────────────────────────────────────────

    def soft_delete!(user, transaction_id)
      txn = find_transaction!(user, transaction_id)

      if month_closed?(user, txn.txn_date)
        raise ActiveRecord::RecordInvalid.new(txn), "Cannot delete transactions in a closed month."
      end

      txn.soft_delete!
      txn
    end

    # ── Read ─────────────────────────────────────────────────

    def find_transaction!(user, transaction_id)
      user.transactions.find(transaction_id)
    end

    def payments(user, scope: user.transactions)
      scope.payments.ordered
    end

    def deposits(user, scope: user.transactions)
      scope.deposits.ordered
    end

    def transfers(user, scope: user.transactions)
      scope.transfers.ordered
    end

    def for_account(user, account_id)
      user.transactions.where(
        "account_id = :id OR from_account_id = :id OR to_account_id = :id",
        id: account_id
      ).ordered
    end

    def for_date_range(user, start_date, end_date)
      user.transactions.where(txn_date: start_date..end_date).ordered
    end

    private

    def normalize_attrs(attrs)
      attrs = attrs.symbolize_keys
      attrs[:amount] = attrs[:amount].to_d.abs if attrs.key?(:amount)
      attrs
    end

    def month_closed?(user, txn_date)
      return false unless txn_date
      om = OpenMonthMaster.for_user(user)
      txn_date < Date.new(om.current_year, om.current_month, 1)
    end

    def enforce_classification_only!(attrs)
      financial_changes = attrs.keys & FINANCIAL_FIELDS
      if financial_changes.any?
        raise ActiveRecord::RecordNotSaved, "Cannot change #{financial_changes.join(', ')} in a closed month. Only classification fields allowed."
      end
    end

    def flag_open_month(user, txn_date, source)
      return unless txn_date
      om = OpenMonthMaster.for_user(user)
      if txn_date.year == om.current_year && txn_date.month == om.current_month
        om.mark_has_data!(source)
      end
    end
  end
end
