class AccountTypeMaster < ApplicationRecord
  belongs_to :owner_user, class_name: "User", optional: true

  has_many :user_account_types, dependent: :restrict_with_error
  has_many :accounts, dependent: :restrict_with_error

  default_scope { where(deleted_at: nil) }

  validates :display_name, presence: true, length: { maximum: 80 }
  validates :normalized_key, presence: true
  validate :normalized_key_unique_within_scope

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:sort_order, :display_name) }
  scope :system_types, -> { where(owner_user_id: nil) }
  scope :custom_for_user, ->(user_id) { where(owner_user_id: user_id) }

  before_validation :generate_normalized_key, if: -> { normalized_key.blank? && display_name.present? }

  def custom?
    owner_user_id.present?
  end

  def in_use?
    accounts.exists?
  end

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def self.seed_defaults_for_user(user)
    existing_ids = UserAccountType.where(user_id: user.id).pluck(:account_type_master_id)
    system_types.active.ordered.each do |master|
      next if existing_ids.include?(master.id)
      UserAccountType.create!(user: user, account_type_master: master, is_enabled: true)
    end
  end

  private

  def generate_normalized_key
    self.normalized_key = display_name.strip.downcase
  end

  def normalized_key_unique_within_scope
    return if normalized_key.blank?

    scope = self.class.unscoped.where(deleted_at: nil, normalized_key: normalized_key).where.not(id: id)

    if custom?
      # Custom type: can't duplicate same user's other custom types
      if scope.where(owner_user_id: owner_user_id).exists?
        errors.add(:display_name, "has already been taken")
      end
      # Custom type: can't duplicate any system type
      if scope.where(owner_user_id: nil).exists?
        errors.add(:display_name, "matches a system account type")
      end
    else
      # System type: must be globally unique among system types
      if scope.where(owner_user_id: nil).exists?
        errors.add(:normalized_key, "has already been taken")
      end
    end
  end
end
