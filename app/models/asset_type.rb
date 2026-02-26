class AssetType < ApplicationRecord
  include Auditable
  audit_exclude :sort_order, :normalized_key

  belongs_to :user, optional: true  # NULL = system type

  has_many :assets, dependent: :restrict_with_error

  default_scope { where(deleted_at: nil) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :normalized_key, presence: true
  validate :normalized_key_unique_within_scope

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:sort_order, :name) }
  scope :system_types, -> { where(user_id: nil) }
  scope :custom_for_user, ->(user_id) { where(user_id: user_id) }

  before_validation :generate_normalized_key, if: -> { normalized_key.blank? && name.present? }

  def custom?
    user_id.present?
  end

  def in_use?
    assets.exists?
  end

  private

  def generate_normalized_key
    self.normalized_key = name.strip.downcase
  end

  def normalized_key_unique_within_scope
    return if normalized_key.blank?
    scope = self.class.unscoped.where(deleted_at: nil, normalized_key: normalized_key).where.not(id: id)
    if custom?
      if scope.where(user_id: user_id).exists?
        errors.add(:name, "has already been taken")
      end
    else
      if scope.where(user_id: nil).exists?
        errors.add(:normalized_key, "has already been taken")
      end
    end
  end
end
