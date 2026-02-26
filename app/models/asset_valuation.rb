class AssetValuation < ApplicationRecord
  include Auditable

  SOURCES = %w[manual appraisal system].freeze

  belongs_to :asset

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(deleted_at: nil) }
  scope :chronological, -> { order(valuation_date: :asc) }
  scope :reverse_chronological, -> { order(valuation_date: :desc) }

  validates :valuation_date, presence: true
  validates :value, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :source, presence: true, inclusion: { in: SOURCES }

  # Resolve user_id from parent asset for audit logging
  def user_id
    asset&.user_id
  end
end
