class DebtTransaction < ApplicationRecord
  include Auditable

  belongs_to :user
  belongs_to :financing_instrument
  belongs_to :financing_payment, optional: true

  default_scope { where(deleted_at: nil) }

  TRANSACTION_TYPES = %w[CREATE PAYMENT ADJUSTMENT INTEREST FEE].freeze

  validates :transaction_date, presence: true
  validates :amount, presence: true, numericality: true
  validates :transaction_type, presence: true, inclusion: { in: TRANSACTION_TYPES }

  scope :for_instrument, ->(id) { where(financing_instrument_id: id) }
  scope :up_to_date, ->(date) { where("transaction_date <= ?", date) }
end
