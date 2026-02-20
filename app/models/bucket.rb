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
  validates :current_balance, numericality: true
  validates :target_amount, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  validate :only_one_default_per_account, if: :is_default?

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def record_transaction!(direction:, amount:, source_type:, source_id: nil, memo: nil, txn_date: Date.current)
    bucket_transactions.create!(
      user: user,
      txn_date: txn_date,
      direction: direction,
      amount: amount,
      source_type: source_type,
      source_id: source_id,
      memo: memo
    )

    if direction == "IN"
      self.current_balance += amount
    else
      self.current_balance -= amount
    end
    save!
  end

  private

  def only_one_default_per_account
    existing = Bucket.where(user_id: user_id, account_id: account_id, is_default: true)
    existing = existing.where.not(id: id) if persisted?
    if existing.exists?
      errors.add(:is_default, "bucket already exists for this account")
    end
  end
end
