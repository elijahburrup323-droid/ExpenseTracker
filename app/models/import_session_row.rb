class ImportSessionRow < ApplicationRecord
  belongs_to :import_session

  CLASSIFICATIONS = %w[payment deposit transfer skip].freeze
  STATUSES = %w[pending imported skipped duplicate error].freeze

  validates :row_number, presence: true
  validates :classification, inclusion: { in: CLASSIFICATIONS }, allow_nil: true
  validates :status, inclusion: { in: STATUSES }

  scope :pending,       -> { where(status: "pending") }
  scope :importable,    -> { pending.where.not(classification: "skip") }
  scope :classified_as, ->(type) { where(classification: type) }
end
