class TransferMaster < ApplicationRecord
  belongs_to :user
  belongs_to :from_account, class_name: "Account"
  belongs_to :to_account, class_name: "Account"
  belongs_to :from_bucket, class_name: "Bucket", optional: true
  belongs_to :to_bucket, class_name: "Bucket", optional: true

  validates :transfer_date, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :memo, length: { maximum: 255 }
  validate :accounts_must_differ

  scope :ordered, -> { order(transfer_date: :desc, created_at: :desc) }

  private

  def accounts_must_differ
    return unless from_account_id.present? && from_account_id == to_account_id

    # Same account: require both buckets and they must differ
    if from_bucket_id.blank? || to_bucket_id.blank?
      errors.add(:base, "Select both buckets to move funds within the same account.")
    elsif from_bucket_id == to_bucket_id
      errors.add(:base, "From Bucket and To Bucket cannot be the same.")
    end
    # If both buckets present and different → valid bucket reallocation
  end
end
