class Asset < ApplicationRecord
  belongs_to :user
  belongs_to :asset_type

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

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  # Market value for net worth aggregation
  def net_worth_value
    include_in_net_worth ? current_value.to_d : BigDecimal("0")
  end
end
