class Transaction < ApplicationRecord
  belongs_to :user
  belongs_to :account, optional: true
  belongs_to :from_account, class_name: "Account", optional: true
  belongs_to :to_account, class_name: "Account", optional: true
  belongs_to :spending_category, optional: true
  belongs_to :spending_type, optional: true

  default_scope { where(deleted_at: nil) }

  TXN_TYPES = %w[payment deposit transfer].freeze

  scope :payments,  -> { where(txn_type: "payment") }
  scope :deposits,  -> { where(txn_type: "deposit") }
  scope :transfers, -> { where(txn_type: "transfer") }
  scope :ordered,   -> { order(txn_date: :desc, created_at: :desc) }

  validates :txn_date, presence: true
  validates :txn_type, presence: true, inclusion: { in: TXN_TYPES }
  validates :amount, presence: true, numericality: true
  validates :description, length: { maximum: 255 }
  validates :memo, length: { maximum: 500 }

  # Type-specific validations (mirror the DB CHECK constraints)
  validate :enforce_payment_rules, if: -> { txn_type == "payment" }
  validate :enforce_deposit_rules, if: -> { txn_type == "deposit" }
  validate :enforce_transfer_rules, if: -> { txn_type == "transfer" }

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def payment?  = txn_type == "payment"
  def deposit?  = txn_type == "deposit"
  def transfer? = txn_type == "transfer"

  private

  def enforce_payment_rules
    errors.add(:account_id, "is required for payments") if account_id.blank?
    errors.add(:spending_category_id, "is required for payments") if spending_category_id.blank?
    errors.add(:from_account_id, "must be blank for payments") if from_account_id.present?
    errors.add(:to_account_id, "must be blank for payments") if to_account_id.present?
  end

  def enforce_deposit_rules
    errors.add(:account_id, "is required for deposits") if account_id.blank?
    errors.add(:from_account_id, "must be blank for deposits") if from_account_id.present?
    errors.add(:to_account_id, "must be blank for deposits") if to_account_id.present?
  end

  def enforce_transfer_rules
    errors.add(:from_account_id, "is required for transfers") if from_account_id.blank?
    errors.add(:to_account_id, "is required for transfers") if to_account_id.blank?
    errors.add(:account_id, "must be blank for transfers") if account_id.present?
    errors.add(:spending_category_id, "must be blank for transfers") if spending_category_id.present?
  end
end
