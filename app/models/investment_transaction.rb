class InvestmentTransaction < ApplicationRecord
  belongs_to :user
  belongs_to :investment_holding

  has_many :buy_lots, class_name: "InvestmentLot", foreign_key: :buy_transaction_id, dependent: :restrict_with_error
  has_many :sell_lots, class_name: "InvestmentLot", foreign_key: :sell_transaction_id, dependent: :nullify

  default_scope { where(deleted_at: nil) }

  TRANSACTION_TYPES = %w[BUY SELL DIVIDEND SPLIT].freeze

  scope :buys, -> { where(transaction_type: "BUY") }
  scope :sells, -> { where(transaction_type: "SELL") }
  scope :by_date, -> { order(:transaction_date, :created_at) }

  validates :transaction_type, presence: true, inclusion: { in: TRANSACTION_TYPES }
  validates :transaction_date, presence: true
  validates :shares, numericality: { greater_than: 0 }
  validates :price_per_share, numericality: { greater_than_or_equal_to: 0 }
  validates :total_amount, numericality: true
  validates :fees, numericality: { greater_than_or_equal_to: 0 }

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end
end
