class InvestmentHolding < ApplicationRecord
  include Auditable
  include RecalculationAuditable
  audit_exclude :sort_order

  belongs_to :user
  belongs_to :account

  has_many :investment_transactions, dependent: :restrict_with_error
  has_many :investment_lots, dependent: :restrict_with_error

  default_scope { where(deleted_at: nil) }

  SECURITY_TYPES = %w[STOCK ETF MUTUAL_FUND BOND CRYPTO CASH OTHER].freeze
  MAX_RECOMMENDED_TRANSACTIONS = 5_000

  scope :active, -> { where(deleted_at: nil) }
  scope :ordered, -> { order(:sort_order, :security_name) }
  scope :included_in_net_worth, -> { where(include_in_net_worth: true) }

  validates :security_name, presence: true, length: { maximum: 120 }
  validates :ticker_symbol, length: { maximum: 20 }, allow_blank: true
  validates :security_type, presence: true, inclusion: { in: SECURITY_TYPES }
  validates :shares_held, numericality: true
  validates :cost_basis_total, numericality: true
  validates :current_price, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  # Market value = shares_held * current_price
  def market_value
    return BigDecimal("0") unless current_price.present? && shares_held.present?
    (shares_held * current_price).round(2)
  end

  # Unrealized gain = market_value - cost_basis_total (dynamic, never stored)
  def unrealized_gain
    market_value - cost_basis_total.to_d
  end

  # Value for net worth aggregation
  def net_worth_value
    include_in_net_worth ? market_value : BigDecimal("0")
  end

  # Optimized portfolio summary via single SQL query (no per-row loops).
  # Returns array of hashes: [{ id:, security_name:, shares_held:, cost_basis_total:, market_value:, unrealized_gain: }]
  scope :with_computed_values, -> {
    select(
      "investment_holdings.*",
      "(shares_held * COALESCE(current_price, 0)) AS computed_market_value",
      "((shares_held * COALESCE(current_price, 0)) - cost_basis_total) AS computed_unrealized_gain"
    )
  }

  # Returns true if the holding has more transactions than the recommended maximum.
  def transaction_count_exceeded?
    investment_transactions.unscope(where: :deleted_at).count > MAX_RECOMMENDED_TRANSACTIONS
  end

  # Recalculate shares_held and cost_basis_total from open lots.
  # Uses bounded forward-only processing — only recalculates from affected lots.
  def recalculate_from_lots!(from_date: nil)
    RecalculationSafetyService.with_safety(entity: self, user_id: user_id) do
      lots = investment_lots.where(status: %w[OPEN PARTIAL])
      lots = lots.where("acquired_date >= ?", from_date) if from_date
      self.shares_held = lots.sum(:shares_remaining)
      self.cost_basis_total = lots.sum("shares_remaining * cost_per_share").to_d.round(2)
      save!
    end
  end
end
