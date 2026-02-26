class AmortizationScheduleEntry < ApplicationRecord
  belongs_to :user
  belongs_to :financing_instrument
  belongs_to :financing_payment, optional: true

  scope :projected, -> { where(is_actual: false) }
  scope :actual, -> { where(is_actual: true) }
  scope :by_period, -> { order(:period_number) }
  scope :for_period_range, ->(from, to) { where(period_number: from..to) }

  validates :period_number, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :period_number, uniqueness: { scope: :financing_instrument_id }
  validates :due_date, presence: true
  validates :payment_amount, numericality: true
  validates :principal_amount, numericality: true
  validates :interest_amount, numericality: true
  validates :extra_principal_amount, numericality: true
  validates :beginning_balance, numericality: true
  validates :ending_balance, numericality: true
end
