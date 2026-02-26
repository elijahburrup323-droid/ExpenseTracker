class InvestmentTransaction < ApplicationRecord
  include Auditable
  audit_include_always :transaction_type, :investment_holding_id

  belongs_to :user
  belongs_to :investment_holding

  has_many :buy_lots, class_name: "InvestmentLot", foreign_key: :buy_transaction_id, dependent: :restrict_with_error
  has_many :sell_lots, class_name: "InvestmentLot", foreign_key: :sell_transaction_id, dependent: :nullify

  default_scope { where(deleted_at: nil) }

  TRANSACTION_TYPES = %w[BUY SELL DIVIDEND REINVEST FEE SPLIT].freeze
  SHARE_TYPES = %w[BUY SELL REINVEST SPLIT].freeze  # Types that require shares + price
  AMOUNT_ONLY_TYPES = %w[DIVIDEND FEE].freeze         # Types that require amount only

  scope :buys, -> { where(transaction_type: %w[BUY REINVEST]) }
  scope :sells, -> { where(transaction_type: "SELL") }
  scope :by_date, -> { order(:transaction_date, :created_at) }
  scope :recent, ->(limit = 100) { order(transaction_date: :desc).limit(limit) }

  validates :transaction_type, presence: true, inclusion: { in: TRANSACTION_TYPES }
  validates :transaction_date, presence: true
  validates :total_amount, numericality: true

  # Shares required and > 0 for BUY/SELL/REINVEST/SPLIT; nullable for DIVIDEND/FEE
  validates :shares, numericality: { greater_than: 0 }, if: :requires_shares?
  validates :shares, absence: { message: "must be blank for %{value} transactions" }, unless: :requires_shares?, if: -> { shares.present? && shares != 0 }

  # Price required and >= 0 for BUY/SELL/REINVEST/SPLIT; nullable for DIVIDEND/FEE
  validates :price_per_share, numericality: { greater_than_or_equal_to: 0 }, if: :requires_shares?

  validates :fees, numericality: { greater_than_or_equal_to: 0 }

  # Cannot sell more shares than the holding currently owns
  validate :sell_does_not_exceed_available_shares, if: -> { transaction_type == "SELL" }

  private

  def requires_shares?
    SHARE_TYPES.include?(transaction_type)
  end

  def sell_does_not_exceed_available_shares
    return unless investment_holding.present? && shares.present?
    available = investment_holding.shares_held
    # If editing an existing sell, add back the old shares to available pool
    if persisted? && shares_was.present?
      available += shares_was
    end
    if shares > available
      errors.add(:shares, "cannot exceed available shares (#{available})")
    end
  end
end
