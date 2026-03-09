class RecurringTransfer < ApplicationRecord
  belongs_to :user
  belongs_to :from_account, class_name: "Account"
  belongs_to :to_account, class_name: "Account"
  belongs_to :from_bucket, class_name: "Bucket", optional: true
  belongs_to :to_bucket, class_name: "Bucket", optional: true
  belongs_to :frequency_master, class_name: "IncomeFrequencyMaster"

  default_scope { where(deleted_at: nil) }

  scope :ordered, -> { order(:sort_order, :created_at) }
  scope :due, -> { where("next_date <= ?", Date.current).where(use_flag: true) }

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :next_date, presence: true
  validates :memo, length: { maximum: 255 }
  validate :accounts_must_differ

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def advance_next_date!
    new_date = frequency_master.next_date_from(next_date)
    update!(next_date: new_date)
  end

  private

  def accounts_must_differ
    return unless from_account_id.present? && from_account_id == to_account_id

    if from_bucket_id.blank? || to_bucket_id.blank?
      errors.add(:base, "Select both buckets to move funds within the same account.")
    elsif from_bucket_id == to_bucket_id
      errors.add(:base, "From Bucket and To Bucket cannot be the same.")
    end
  end
end
