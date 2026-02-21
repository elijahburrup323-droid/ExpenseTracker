class Bucket < ApplicationRecord
  belongs_to :user
  belongs_to :account
  has_many :bucket_transactions, dependent: :destroy
  has_many :payments

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:sort_order, :name) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: [:user_id, :account_id],
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken for this account"
  }
  validates :current_balance, numericality: { greater_than_or_equal_to: 0, message: "cannot be negative" }, on: :create
  validates :current_balance, numericality: true, on: :update
  validates :target_amount, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  validate :only_one_default_per_account, if: :is_default?
  validate :only_one_priority_zero_per_account
  validate :account_belongs_to_user

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def record_transaction!(direction:, amount:, source_type:, source_id: nil, memo: nil, txn_date: Date.current)
    new_balance = if direction == "IN"
                    current_balance + amount
                  else
                    current_balance - amount
                  end

    if new_balance < 0
      raise ActiveRecord::RecordInvalid.new(self), "Bucket balance cannot go negative (would be #{new_balance})"
    end

    bucket_transactions.create!(
      user: user,
      txn_date: txn_date,
      direction: direction,
      amount: amount,
      source_type: source_type,
      source_id: source_id,
      memo: memo
    )

    self.current_balance = new_balance
    save!
  end

  private

  def account_belongs_to_user
    if account_id.present? && user_id.present?
      unless Account.where(id: account_id, user_id: user_id).exists?
        errors.add(:account, "does not belong to this user")
      end
    end
  end

  def only_one_default_per_account
    existing = Bucket.where(user_id: user_id, account_id: account_id, is_default: true)
    existing = existing.where.not(id: id) if persisted?
    if existing.exists?
      errors.add(:base, "A default bucket already exists for this account.")
    end
  end

  def only_one_priority_zero_per_account
    return unless priority == 0 && account_id.present?
    existing = Bucket.where(user_id: user_id, account_id: account_id, priority: 0)
    existing = existing.where.not(id: id) if persisted?
    if existing.exists?
      errors.add(:priority, "Only one primary bucket (priority 0) is allowed per account.")
    end
  end
end
