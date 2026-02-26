class InvestmentAccount < ApplicationRecord
  include Auditable

  belongs_to :user

  has_many :investment_holdings, dependent: :restrict_with_error
  has_many :investment_transactions, through: :investment_holdings

  default_scope { where(deleted_at: nil) }

  ACCOUNT_TYPES = [
    "Brokerage",
    "IRA",
    "Roth IRA",
    "401k",
    "403b",
    "529 Plan",
    "HSA",
    "SEP IRA",
    "Trust",
    "Other"
  ].freeze

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:name) }
  scope :included_in_net_worth, -> { where(include_in_net_worth: true, active: true) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: :user_id,
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken"
  }
  validates :account_type, presence: true, inclusion: { in: ACCOUNT_TYPES }

  # Total market value of all holdings in this account
  def total_market_value
    investment_holdings.where(deleted_at: nil).sum("shares_held * COALESCE(current_price, 0)")
  end

  # Total cost basis of all holdings in this account
  def total_cost_basis
    investment_holdings.where(deleted_at: nil).sum(:cost_basis_total)
  end

  # Total unrealized gain across all holdings
  def total_unrealized_gain
    total_market_value - total_cost_basis
  end

  # Value used for net worth aggregation
  def net_worth_value
    return BigDecimal("0") unless include_in_net_worth && active
    total_market_value
  end
end
