class SpendingCategory < ApplicationRecord
  belongs_to :user
  belongs_to :spending_type
  has_many :payments
  has_many :tag_assignments, as: :taggable, dependent: :destroy
  has_many :tags, through: :tag_assignments

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(deleted_at: nil) }
  scope :ordered, -> { order(:sort_order, :name) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: :user_id,
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken"
  }
  validates :description, presence: true, length: { maximum: 255 }
  validates :spending_type, presence: true

  DEFAULTS = [
    { name: "Groceries", description: "Food and household essentials.", spending_type_name: "Need", is_debt: false, icon_key: "shopping-cart", color_key: "blue", sort_order: 1 },
    { name: "Dining Out", description: "Restaurants, cafes, and fast food.", spending_type_name: "Want", is_debt: false, icon_key: "utensils", color_key: "gold", sort_order: 2 },
    { name: "Mortgage", description: "Primary home loan payments.", spending_type_name: "Need", is_debt: true, icon_key: "home", color_key: "purple", sort_order: 3 },
    { name: "Investment Fund", description: "Contributions to investment growth and reserves.", spending_type_name: "Savings / Investment", is_debt: false, icon_key: "chart-line", color_key: "green", sort_order: 4 }
  ].freeze

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def self.seed_defaults_for(user)
    return if unscoped.where(user_id: user.id).exists?

    DEFAULTS.each do |attrs|
      type = user.spending_types.find_by(name: attrs[:spending_type_name])
      next unless type

      user.spending_categories.create!(
        name: attrs[:name],
        description: attrs[:description],
        spending_type: type,
        is_debt: attrs[:is_debt],
        icon_key: attrs[:icon_key],
        color_key: attrs[:color_key],
        sort_order: attrs[:sort_order]
      )
    end
  end
end
