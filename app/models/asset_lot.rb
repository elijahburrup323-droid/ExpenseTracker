class AssetLot < ApplicationRecord
  include Auditable

  belongs_to :user
  belongs_to :asset

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(deleted_at: nil) }
  scope :chronological, -> { order(:acquired_date, :id) }
  scope :reverse_chronological, -> { order(acquired_date: :desc, id: :desc) }

  validates :acquired_date, presence: true
  validates :quantity, numericality: { greater_than: 0 }
  validates :price_per_unit, numericality: { greater_than_or_equal_to: 0 }
  validates :total_cost, numericality: true

  before_validation :compute_total_cost, if: -> { quantity.present? && price_per_unit.present? }

  private

  def compute_total_cost
    self.total_cost = (quantity * price_per_unit).round(2)
  end
end
