class InvestmentLot < ApplicationRecord
  belongs_to :user
  belongs_to :investment_holding
  belongs_to :buy_transaction, class_name: "InvestmentTransaction"
  belongs_to :sell_transaction, class_name: "InvestmentTransaction", optional: true

  LOT_STATUSES = %w[OPEN PARTIAL CLOSED].freeze

  scope :open_lots, -> { where(status: %w[OPEN PARTIAL]) }
  scope :fifo_order, -> { order(:acquired_date, :id) }  # FIFO: oldest first, break ties by ID

  validates :acquired_date, presence: true
  validates :shares_acquired, numericality: { greater_than: 0 }
  validates :shares_remaining, numericality: { greater_than_or_equal_to: 0 }
  validates :cost_per_share, numericality: { greater_than_or_equal_to: 0 }
  validates :cost_basis, numericality: true
  validates :status, presence: true, inclusion: { in: LOT_STATUSES }

  # Consume shares from this lot (FIFO sell). Returns shares actually consumed.
  def consume_shares!(shares_to_sell)
    consumable = [shares_to_sell, shares_remaining].min
    self.shares_remaining -= consumable
    self.status = shares_remaining.zero? ? "CLOSED" : "PARTIAL"
    save!
    consumable
  end

  # Cost basis of consumed shares
  def cost_basis_for_shares(qty)
    (qty * cost_per_share).round(2)
  end
end
