class Account < ApplicationRecord
  belongs_to :user
  belongs_to :account_type, optional: true
  belongs_to :account_type_master, optional: true
  has_many :payments
  has_many :income_entries
  has_many :transfers_from, class_name: "TransferMaster", foreign_key: :from_account_id
  has_many :transfers_to, class_name: "TransferMaster", foreign_key: :to_account_id
  has_many :buckets
  has_many :balance_adjustments
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
  validates :institution, length: { maximum: 120 }
  validates :balance, numericality: true
  validates :beginning_balance, numericality: true

  # Computes { assets:, liabilities:, net_worth: } from any accounts scope.
  # Single source of truth for net worth math — replaces all raw sum(:balance) calls.
  def self.net_worth_for(accounts_scope)
    credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id)
    asset_total = accounts_scope.where.not(account_type_master_id: credit_ids).sum(:balance)
    liability_total = accounts_scope.where(account_type_master_id: credit_ids).sum(:balance)
    { assets: asset_total.to_f, liabilities: liability_total.to_f, net_worth: (asset_total - liability_total).to_f }
  end

  # Returns 1 for DEBIT (asset) accounts, -1 for CREDIT (liability) accounts.
  # All balance operations multiply by this value to get correct sign behavior.
  def balance_multiplier
    account_type_master&.normal_balance_type == "CREDIT" ? -1 : 1
  end

  def buckets_enabled?
    buckets.active.exists?
  end

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end
end
