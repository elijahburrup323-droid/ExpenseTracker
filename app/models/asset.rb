class Asset < ApplicationRecord
  include Auditable
  audit_exclude :sort_order

  belongs_to :user
  belongs_to :asset_type

  has_many :asset_valuations, dependent: :destroy
  has_many :asset_lots, dependent: :restrict_with_error

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(deleted_at: nil) }
  scope :ordered, -> { order(:sort_order, :name) }
  scope :included_in_net_worth, -> { where(include_in_net_worth: true) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: :user_id,
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken"
  }
  validates :current_value, numericality: true
  validates :purchase_price, numericality: true, allow_nil: true
  validates :total_quantity, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :total_cost_basis, numericality: true, allow_nil: true
  validates :current_price_per_unit, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :unit_label, presence: true, length: { maximum: 20 }, if: :unit_based?

  UNIT_BASED_KEYS = ["precious metals", "cryptocurrency"].freeze
  DEPRECIATION_METHODS = %w[NONE STRAIGHT_LINE PERCENTAGE].freeze
  validates :depreciation_method, inclusion: { in: DEPRECIATION_METHODS }
  validates :useful_life_years, numericality: { greater_than: 0, only_integer: true }, if: -> { depreciation_method == "STRAIGHT_LINE" }
  validates :annual_rate, numericality: { greater_than_or_equal_to: -100, less_than_or_equal_to: 100 }, allow_nil: true

  # Market value for net worth aggregation (uses actual current_value, NOT projections)
  def net_worth_value
    include_in_net_worth ? current_value.to_d : BigDecimal("0")
  end

  # Calculate projected value for a given date (display-only, never stored)
  def projected_value(as_of_date = Date.current)
    return nil unless projection_enabled && purchase_price.present? && purchase_date.present?
    return nil if depreciation_method == "NONE"

    years_elapsed = (as_of_date - purchase_date).to_f / 365.25
    return purchase_price.to_d if years_elapsed <= 0

    case depreciation_method
    when "STRAIGHT_LINE"
      return nil unless useful_life_years.present? && useful_life_years > 0
      annual_dep = purchase_price.to_d / useful_life_years
      projected = purchase_price.to_d - (annual_dep * years_elapsed)
      [projected, BigDecimal("0")].max
    when "PERCENTAGE"
      return nil unless annual_rate.present?
      rate = annual_rate.to_d / 100
      projected = purchase_price.to_d * ((1 + rate) ** years_elapsed)
      [projected, BigDecimal("0")].max
    else
      nil
    end
  end

  # 5-year projection summary (array of {year:, value:} hashes)
  def five_year_projection
    return [] unless projection_enabled && purchase_price.present? && purchase_date.present? && depreciation_method != "NONE"

    today = Date.current
    (1..5).map do |y|
      val = projected_value(today + y.years)
      { year: today.year + y, value: val&.round(2) }
    end.compact
  end

  # Does this asset type track quantity/lots (Precious Metals, Crypto)?
  def unit_based?
    asset_type&.normalized_key.in?(UNIT_BASED_KEYS)
  end

  # Unrealized gain/loss for unit-based assets
  def unrealized_gain
    return nil unless unit_based? && total_cost_basis.to_d > 0
    current_value.to_d - total_cost_basis.to_d
  end

  # Recalculate rollup fields from lots. Call after any lot create/update/delete.
  def recalculate_from_lots!
    lots = asset_lots.where(deleted_at: nil)
    self.total_quantity   = lots.sum(:quantity)
    self.total_cost_basis = lots.sum(:total_cost)

    if current_price_per_unit.present? && total_quantity.to_d > 0
      self.current_value = (total_quantity * current_price_per_unit).round(2)
    end

    save!
  end
end
