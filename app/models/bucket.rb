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
  validates :max_spend_per_year, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :bucket_year_start_month, numericality: { only_integer: true, in: 1..12 }

  validate :only_one_default_per_account, if: :is_default?
  validate :only_one_priority_zero_per_account
  validate :account_belongs_to_user
  validate :max_spend_not_greater_than_target

  # Compute the bucket year window based on bucket_year_start_month.
  # Returns [start_date, end_date] for the current bucket year.
  def bucket_year_window(reference_date = Date.current)
    sm = bucket_year_start_month || 1
    year = reference_date.year
    start_date = Date.new(year, sm, 1)
    # If current date is before the start month, the bucket year started last year
    start_date = Date.new(year - 1, sm, 1) if reference_date < start_date
    end_date = start_date.next_year - 1.day
    [start_date, end_date]
  end

  # Sum of all PAYMENT_EXECUTION OUT transactions within the bucket year window.
  # Only actual payments count as spending; transfers and adjustments do not.
  def spent_ytd(reference_date = Date.current)
    return 0.0 unless max_spend_per_year.present?
    start_date, end_date = bucket_year_window(reference_date)
    bucket_transactions
      .where(direction: "OUT", source_type: "PAYMENT_EXECUTION", txn_date: start_date..end_date)
      .sum(:amount)
      .to_f
  end

  def available_to_spend(reference_date = Date.current)
    return nil unless max_spend_per_year.present?
    [max_spend_per_year.to_f - spent_ytd(reference_date), 0.0].max
  end

  # Returns true if recording this spend amount would exceed the annual cap.
  def spend_exceeds_cap?(amount, reference_date = Date.current)
    return false unless max_spend_per_year.present?
    spent_ytd(reference_date) + amount.to_f > max_spend_per_year.to_f
  end

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

  def max_spend_not_greater_than_target
    return unless max_spend_per_year.present? && target_amount.present?
    if max_spend_per_year > target_amount
      errors.add(:max_spend_per_year, "cannot exceed Target")
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
