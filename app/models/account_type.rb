class AccountType < ApplicationRecord
  belongs_to :user

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
  validates :description, length: { maximum: 255 }

  DEFAULTS = [
    { name: "Checking", description: "Checking Account", icon_key: "credit-card", color_key: "blue", sort_order: 1 },
    { name: "Savings", description: "Savings Account", icon_key: "piggy-bank", color_key: "green", sort_order: 2 },
    { name: "Venmo", description: "Venmo Cash Card", icon_key: "smartphone", color_key: "purple", sort_order: 3 }
  ].freeze

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def self.seed_defaults_for(user)
    return if user.account_types.unscoped.where(user_id: user.id).exists?

    DEFAULTS.each do |attrs|
      user.account_types.create!(attrs.merge(is_system: true))
    end
  end
end
