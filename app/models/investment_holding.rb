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

  # Recalculate shares_held and cost_basis_total from open lots
  def recalculate_from_lots!
    open_lots = investment_lots.where(status: %w[OPEN PARTIAL])
    self.shares_held = open_lots.sum(:shares_remaining)
    self.cost_basis_total = open_lots.sum { |lot| lot.shares_remaining * lot.cost_per_share }.round(2)
    save!
  end
end
