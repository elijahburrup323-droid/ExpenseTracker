class BucketTransaction < ApplicationRecord
  belongs_to :user
  belongs_to :bucket

  validates :txn_date, presence: true
  validates :direction, presence: true, inclusion: { in: %w[IN OUT] }
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :source_type, presence: true, inclusion: { in: %w[TRANSFER PAYMENT_EXECUTION ADJUSTMENT DEPOSIT INITIAL FUND_MOVE] }
end
