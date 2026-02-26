class FinancingInstrument < ApplicationRecord
  include Auditable
  include RecalculationAuditable
  audit_exclude :sort_order
  audit_include_always :instrument_type

  belongs_to :user
  belongs_to :account, optional: true

  has_many :financing_payments, dependent: :restrict_with_error
  has_many :amortization_schedule_entries, dependent: :destroy

  default_scope { where(deleted_at: nil) }

  INSTRUMENT_TYPES = %w[PAYABLE RECEIVABLE].freeze
  INSTRUMENT_SUBTYPES = %w[
    MORTGAGE AUTO_LOAN STUDENT_LOAN PERSONAL_LOAN HELOC
    BUSINESS_LOAN CONTRACT_FOR_DEED PROMISSORY_NOTE OTHER
  ].freeze
  PAYMENT_FREQUENCIES = %w[MONTHLY BI_WEEKLY WEEKLY].freeze

  scope :active, -> { where(deleted_at: nil) }
  scope :ordered, -> { order(:sort_order, :name) }
  scope :payables, -> { where(instrument_type: "PAYABLE") }
  scope :receivables, -> { where(instrument_type: "RECEIVABLE") }
  scope :included_in_net_worth, -> { where(include_in_net_worth: true) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: :user_id,
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken"
  }
  validates :instrument_type, presence: true, inclusion: { in: INSTRUMENT_TYPES }
  validates :instrument_subtype, inclusion: { in: INSTRUMENT_SUBTYPES }, allow_nil: true
  validates :original_principal, numericality: { greater_than: 0 }
  validates :current_principal, numericality: true
  validates :interest_rate, numericality: { greater_than_or_equal_to: 0 }
  validates :term_months, numericality: { only_integer: true, greater_than: 0 }
  validates :start_date, presence: true
  validates :payment_frequency, presence: true, inclusion: { in: PAYMENT_FREQUENCIES }
  validates :monthly_payment, numericality: { greater_than: 0 }, allow_nil: true

  def payable?
    instrument_type == "PAYABLE"
  end

  def receivable?
    instrument_type == "RECEIVABLE"
  end

  # Signed value for net worth:
  #   PAYABLE -> negative (liability)
  #   RECEIVABLE -> positive (asset)
  def net_worth_value
    return BigDecimal("0") unless include_in_net_worth
    payable? ? -current_principal.to_d : current_principal.to_d
  end
end
