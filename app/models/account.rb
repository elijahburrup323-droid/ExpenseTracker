class Account < ApplicationRecord
  belongs_to :user
  belongs_to :account_type, optional: true
  belongs_to :account_type_master, optional: true
  has_many :payments
  has_many :income_entries
  has_many :transfers_from, class_name: "TransferMaster", foreign_key: :from_account_id
  has_many :transfers_to, class_name: "TransferMaster", foreign_key: :to_account_id
  has_many :buckets
  has_many :balance_adjustments
  has_many :tag_assignments, as: :taggable, dependent: :destroy
  has_many :tags, through: :tag_assignments

  has_many :synthetic_transactions, -> { where(is_synthetic: true) }, class_name: "Transaction"

  after_create :generate_opening_balance_transaction!

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(deleted_at: nil) }
  scope :ordered, -> { order(:sort_order, :name) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: :user_id,
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken"
  }
  validates :institution, length: { maximum: 120 }
  validates :balance, numericality: true
  validates :beginning_balance, numericality: true

  # Computes { assets:, liabilities:, net_worth: } using the full formula:
  # Net Worth = (Accounts + Assets + Investments + Receivables) − (Liabilities + Payables)
  #
  # Since CREDIT accounts store negative balances and FinancingInstrument#net_worth_value
  # returns negative for PAYABLE: net_worth = account_balances + asset_values +
  # investment_values + financing_values.
  #
  # Single source of truth for net worth math — all net worth goes through this method.
  # Optional `user:` param enables feature-flag gating (global killswitch + per-user activation).
  # Without a user, all modules are included unconditionally.
  def self.net_worth_for(accounts_scope, user: nil)
    credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)

    # 1. Account balances (existing behavior)
    account_asset_total = accounts_scope.where.not(account_type_master_id: credit_ids).sum(:balance)
    account_liability_total = accounts_scope.where(account_type_master_id: credit_ids).sum(:balance)

    # 2-4. New modules: Assets, Investments, Financing
    user_id = accounts_scope.limit(1).pick(:user_id)
    asset_total = BigDecimal("0")
    investment_total = BigDecimal("0")
    financing_total = BigDecimal("0")

    if user_id.present?
      # Determine which modules are enabled (global killswitch + per-user feature activation)
      include_assets = module_enabled?("assets", user)
      include_investments = module_enabled?("investments", user)
      include_financing = module_enabled?("financing", user)

      # Assets: always positive (DEBIT-normal)
      if include_assets
        asset_total = Asset.where(user_id: user_id, include_in_net_worth: true)
                           .where(deleted_at: nil)
                           .sum(:current_value)
      end

      # Investment holdings: market value (shares_held * current_price)
      # Filters through investment_accounts (include_in_net_worth + active).
      # Falls back to holding-level include_in_net_worth for orphan holdings
      # not yet assigned to an investment account.
      if include_investments
        investment_total = BigDecimal("0")

        # Holdings linked to investment accounts — use account-level filter
        investment_total += InvestmentHolding
                              .joins(:investment_account)
                              .where(investment_accounts: { user_id: user_id, include_in_net_worth: true, active: true })
                              .where(investment_holdings: { deleted_at: nil })
                              .where.not(investment_holdings: { current_price: nil })
                              .sum("investment_holdings.shares_held * investment_holdings.current_price")

        # Holdings without an investment account — use holding-level filter (backward compat)
        investment_total += InvestmentHolding
                              .where(user_id: user_id, investment_account_id: nil, include_in_net_worth: true)
                              .where(deleted_at: nil)
                              .where.not(current_price: nil)
                              .sum("shares_held * current_price")
      end

      # Financing instruments: PAYABLE = negative, RECEIVABLE = positive
      if include_financing
        payable_total = FinancingInstrument
                          .where(user_id: user_id, instrument_type: "PAYABLE", include_in_net_worth: true)
                          .where(deleted_at: nil)
                          .sum(:current_principal)
        receivable_total = FinancingInstrument
                             .where(user_id: user_id, instrument_type: "RECEIVABLE", include_in_net_worth: true)
                             .where(deleted_at: nil)
                             .sum(:current_principal)
        financing_total = receivable_total - payable_total
      end
    end

    # Combine all components
    total_assets = account_asset_total + asset_total + investment_total +
                   (financing_total > 0 ? financing_total : BigDecimal("0"))
    total_liabilities = account_liability_total +
                        (financing_total < 0 ? financing_total : BigDecimal("0"))

    {
      assets: total_assets.to_f,
      liabilities: total_liabilities.to_f,
      net_worth: (total_assets + total_liabilities).to_f,
      accounts_total: (account_asset_total + account_liability_total).to_f,
      # Component breakdown for Net Worth card back-of-card display
      accounts_subtotal: account_asset_total.to_f,
      asset_module_total: (asset_total + (financing_total > 0 ? financing_total : BigDecimal("0"))).to_f,
      investment_module_total: investment_total.to_f,
      liabilities_subtotal: (account_liability_total.abs + (financing_total < 0 ? financing_total.abs : BigDecimal("0"))).to_f
    }
  end

  # Check global killswitch + per-user feature activation for a module.
  # Without a user, module is included if global flag is on (backward compat).
  GLOBAL_FLAGS = { "assets" => :FEATURE_ASSETS_ENABLED, "investments" => :FEATURE_INVESTMENTS_ENABLED, "financing" => :FEATURE_FINANCING_ENABLED }.freeze
  def self.module_enabled?(key, user)
    global_const = GLOBAL_FLAGS[key]
    return false if global_const && Object.const_defined?(global_const) && !Object.const_get(global_const)
    return true if user.nil? # no user context → include unconditionally
    user.feature_active?(key)
  end
  private_class_method :module_enabled?

  # --- Centralized balance operations ---
  # All account types use the same arithmetic: payments subtract, deposits add,
  # transfers-in add, transfers-out subtract. No sign multiplier needed because
  # CREDIT (liability) accounts store negative balances directly.

  def apply_payment!(amount)
    self.balance -= amount
    save!
  end

  def reverse_payment!(amount)
    self.balance += amount
    save!
  end

  def apply_transfer_in!(amount)
    self.balance += amount
    save!
  end

  def apply_transfer_out!(amount)
    self.balance -= amount
    save!
  end

  def buckets_enabled?
    buckets.active.exists?
  end

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  # --- Credit Card Profile ---

  def credit_card?
    account_type_master&.normalized_key&.in?(AccountTypeMaster::CREDIT_TYPE_KEYS)
  end

  # New charges since the last statement close date
  def new_charges_since_statement
    return 0.0 unless credit_card? && last_statement_date.present?
    payments.where("payment_date > ?", last_statement_date).sum(:amount).to_f
  end

  # Statement balance = amount due to avoid interest
  def statement_balance_amount
    last_statement_balance.to_f
  end

  # Current balance = statement balance + new charges since statement
  # (already stored in balance column, but this validates the relationship)
  def credit_card_current_balance
    balance.to_f.abs
  end

  # Payoff needed = current balance (what must be paid to zero the card)
  def payoff_needed
    balance.to_f.abs
  end

  # Credit card payoff totals across multiple accounts
  def self.credit_card_payoff_for(user)
    credit_ids = AccountTypeMaster.where(normalized_key: AccountTypeMaster::CREDIT_TYPE_KEYS).pluck(:id)
    cards = user.accounts.where(account_type_master_id: credit_ids)

    total_current = cards.sum { |c| c.balance.to_f.abs }
    total_statement = cards.sum { |c| c.statement_balance_amount }
    total_new_charges = cards.sum { |c| c.new_charges_since_statement }

    {
      total_current_balance: total_current.round(2),
      total_statement_balance: total_statement.round(2),
      total_new_charges: total_new_charges.round(2),
      cards: cards.map { |c|
        {
          id: c.id, name: c.name,
          current_balance: c.balance.to_f.abs.round(2),
          statement_balance: c.statement_balance_amount.round(2),
          new_charges: c.new_charges_since_statement.round(2),
          payment_due_day: c.payment_due_day,
          minimum_payment: c.minimum_payment.to_f.round(2),
          apr: c.apr.to_f
        }
      }
    }
  end

  private

  def generate_opening_balance_transaction!
    return unless include_in_budget?
    return unless account_type_master&.normalized_key&.in?(AccountTypeMaster::SPENDABLE_TYPE_KEYS)
    return unless beginning_balance.to_f > 0

    om = OpenMonthMaster.find_by(user_id: user_id)
    return unless om

    month_start = Date.new(om.current_year, om.current_month, 1)
    return if Date.today == month_start
    return unless Date.today.between?(month_start, month_start.end_of_month)

    Transaction.create!(
      user_id:          user_id,
      txn_date:         Date.today,
      amount:           beginning_balance,
      txn_type:         "deposit",
      description:      "Opening balance \u2014 #{name}",
      account_id:       id,
      source:           "system_synthetic",
      is_synthetic:     true,
      synthetic_reason: "new_account_opening_balance"
    )
  rescue ActiveRecord::RecordNotUnique
    # Idempotency guard: synthetic already exists
  end
end
