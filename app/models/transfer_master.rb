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

  belongs_to :recurring_transfer, optional: true

  def self.generate_due_transfers_for(user)
    generated = []
    user.recurring_transfers.due.each do |recurring|
      next unless recurring.from_account && recurring.to_account
      next if user.transfer_masters.exists?(recurring_transfer_id: recurring.id, transfer_date: recurring.next_date)

      transfer = nil
      ActiveRecord::Base.transaction do
        transfer = user.transfer_masters.create!(
          recurring_transfer: recurring,
          transfer_date: recurring.next_date,
          from_account_id: recurring.from_account_id,
          to_account_id: recurring.to_account_id,
          from_bucket_id: recurring.from_bucket_id,
          to_bucket_id: recurring.to_bucket_id,
          amount: recurring.amount,
          memo: recurring.memo
        )

        # Adjust account balances
        from_acct = recurring.from_account
        to_acct = recurring.to_account
        unless from_acct.id == to_acct.id
          from_acct.balance -= recurring.amount
          from_acct.save!
          to_acct.balance += recurring.amount
          to_acct.save!
        end

        # Bucket transactions
        if recurring.from_bucket_id.present?
          bucket = recurring.from_bucket
          bucket.record_transaction!(
            user: user,
            amount: recurring.amount,
            direction: "OUT",
            source_type: "TRANSFER",
            source_id: transfer.id,
            txn_date: recurring.next_date,
            memo: "Recurring transfer out"
          )
        end
        if recurring.to_bucket_id.present?
          bucket = recurring.to_bucket
          bucket.record_transaction!(
            user: user,
            amount: recurring.amount,
            direction: "IN",
            source_type: "TRANSFER",
            source_id: transfer.id,
            txn_date: recurring.next_date,
            memo: "Recurring transfer in"
          )
        end

        recurring.advance_next_date!
      end
      generated << transfer if transfer
    end
    generated
  end

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
