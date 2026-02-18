class AccountTypeMaster < ApplicationRecord
  has_many :user_account_types, dependent: :restrict_with_error
  has_many :accounts, dependent: :restrict_with_error

  validates :display_name, presence: true, length: { maximum: 80 }
  validates :normalized_key, presence: true, uniqueness: { case_sensitive: false }

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:sort_order, :display_name) }

  before_validation :generate_normalized_key, if: -> { normalized_key.blank? && display_name.present? }

  def in_use?
    user_account_types.exists? || accounts.exists?
  end

  def self.seed_defaults_for_user(user)
    existing_ids = UserAccountType.where(user_id: user.id).pluck(:account_type_master_id)
    active.ordered.each do |master|
      next if existing_ids.include?(master.id)
      UserAccountType.create!(user: user, account_type_master: master, is_enabled: true)
    end
  end

  private

  def generate_normalized_key
    self.normalized_key = display_name.strip.downcase
  end
end
