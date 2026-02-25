class FinancingPayment < ApplicationRecord
  belongs_to :user
  belongs_to :financing_instrument

  has_one :amortization_schedule_entry, dependent: :nullify

  default_scope { where(deleted_at: nil) }

  scope :by_date, -> { order(:payment_date, :payment_number) }
  scope :active, -> { where(deleted_at: nil) }

  validates :payment_date, presence: true
  validates :total_amount, numericality: { greater_than: 0 }
  validates :principal_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :interest_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :extra_principal_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :escrow_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :fees_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :principal_balance_after, numericality: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end
end
