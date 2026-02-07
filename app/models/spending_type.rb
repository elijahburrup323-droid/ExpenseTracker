class SpendingType < ApplicationRecord
  belongs_to :user
  has_many :spending_categories

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:sort_order, :name) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: :user_id,
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken"
  }
  validates :description, presence: true, length: { maximum: 255 }

  DEFAULTS = [
    { name: "Need", description: "Required essential spending.", icon_key: "check-circle", color_key: "blue", sort_order: 1 },
    { name: "Want", description: "Lifestyle or discretionary spending.", icon_key: "star", color_key: "gold", sort_order: 2 },
    { name: "Savings / Investment", description: "Long-term financial growth and reserves.", icon_key: "chart-line", color_key: "green", sort_order: 3 }
  ].freeze

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def self.seed_defaults_for(user)
    return if user.spending_types.unscoped.where(user_id: user.id).exists?

    DEFAULTS.each do |attrs|
      user.spending_types.create!(attrs.merge(is_system: true))
    end
  end
end
