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
  def self.net_worth_for(accounts_scope)
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
      # Assets: always positive (DEBIT-normal)
      asset_total = Asset.where(user_id: user_id, include_in_net_worth: true)
                         .where(deleted_at: nil)
                         .sum(:current_value)

      # Investment holdings: market value (shares_held * current_price)
      investment_total = InvestmentHolding
                           .where(user_id: user_id, include_in_net_worth: true)
                           .where(deleted_at: nil)
                           .where.not(current_price: nil)
                           .sum("shares_held * current_price")

      # Financing instruments: PAYABLE = negative, RECEIVABLE = positive
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

    # Combine all components
    total_assets = account_asset_total + asset_total + investment_total +
                   (financing_total > 0 ? financing_total : BigDecimal("0"))
    total_liabilities = account_liability_total +
                        (financing_total < 0 ? financing_total : BigDecimal("0"))

    {
      assets: total_assets.to_f,
      liabilities: total_liabilities.to_f,
      net_worth: (total_assets + total_liabilities).to_f
    }
  end

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
end
