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

  CANONICAL_TYPES = [
    { display_name: "Checking",              description: "Standard checking account for everyday transactions" },
    { display_name: "Savings",               description: "Standard savings account" },
    { display_name: "High Yield Savings",    description: "Savings account with higher interest rate" },
    { display_name: "Money Market",          description: "Money market account with higher rates and limited transactions" },
    { display_name: "Cash Card",             description: "Prepaid or stored-value card (Venmo, CashApp, etc.)" },
    { display_name: "Credit Card",           description: "Revolving credit card account" },
    { display_name: "Line of Credit",        description: "Revolving line of credit" },
    { display_name: "HELOC",                 description: "Home equity line of credit" },
    { display_name: "Mortgage",              description: "Home mortgage loan" },
    { display_name: "Auto Loan",             description: "Vehicle financing loan" },
    { display_name: "Student Loan",          description: "Education loan" },
    { display_name: "Personal Loan",         description: "Unsecured personal loan" },
    { display_name: "Business Loan",         description: "Business financing loan" },
    { display_name: "401(k)",                description: "Employer-sponsored retirement plan" },
    { display_name: "IRA",                   description: "Individual retirement account (Traditional)" },
    { display_name: "Roth IRA",              description: "Individual retirement account (Roth, post-tax)" },
    { display_name: "Brokerage",             description: "Taxable investment/brokerage account" },
    { display_name: "HSA",                   description: "Health savings account" },
    { display_name: "529 Plan",              description: "Education savings plan" },
    { display_name: "Other Asset Account",   description: "Asset account not covered by other types" },
    { display_name: "Other Liability Account", description: "Liability account not covered by other types" },
  ].freeze

  def self.ensure_system_types!
    existing_keys = system_types.pluck(:normalized_key).map(&:downcase).to_set
    CANONICAL_TYPES.each_with_index do |type, idx|
      key = type[:display_name].strip.downcase
      next if existing_keys.include?(key)
      create!(
        display_name: type[:display_name],
        description: type[:description],
        is_active: true,
        sort_order: idx + 1
      )
    end
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
