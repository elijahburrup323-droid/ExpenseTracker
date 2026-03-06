class Payment < ApplicationRecord
  include LegacyFreezeGuard

  belongs_to :user
  belongs_to :account
  belongs_to :spending_category
  belongs_to :spending_type_override, class_name: 'SpendingType', optional: true
  belongs_to :payment_recurring, optional: true
  belongs_to :bucket, optional: true
  has_many :tag_assignments, as: :taggable, dependent: :destroy
  has_many :tags, through: :tag_assignments

  default_scope { where(deleted_at: nil) }

  scope :ordered, -> { order(payment_date: :desc, sort_order: :desc) }

  validates :description, presence: true, length: { maximum: 255 }
  validates :amount, presence: true, numericality: true
  validates :payment_date, presence: true
  validate :spending_type_override_must_exist, if: -> { spending_type_override_id.present? }

  private def spending_type_override_must_exist
    unless SpendingType.where(deleted_at: nil).exists?(id: spending_type_override_id)
      errors.add(:spending_type_override_id, "must reference a valid, active Spending Type")
    end
  end

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def self.generate_due_payments_for(user)
    generated = []
    user.payment_recurrings.due.each do |recurring|
      next unless recurring.account  # Skip if account was soft-deleted
      next if user.payments.exists?(payment_recurring_id: recurring.id, payment_date: recurring.next_date)

      payment = user.payments.create!(
        payment_recurring: recurring,
        description: recurring.name,
        notes: recurring.memo,
        payment_date: recurring.next_date,
        amount: recurring.amount,
        account_id: recurring.account_id,
        spending_category_id: recurring.spending_category_id,
        sort_order: recurring.sort_order
      )
      account = payment.account
      account.balance -= payment.amount
      account.save!
      sync_recurring_to_transaction_engine!(user, payment, "payments")
      generated << payment
      recurring.advance_next_date!
    end
    generated
  end

  def self.sync_recurring_to_transaction_engine!(user, payment, legacy_table)
    txn = user.transactions.create!(
      txn_date: payment.payment_date,
      txn_type: "payment",
      amount: payment.amount.abs,
      description: payment.description,
      memo: payment.notes,
      account_id: payment.account_id,
      spending_category_id: payment.spending_category_id,
      spending_type_id: payment.spending_type_override_id || payment.spending_category&.spending_type_id,
      reconciled: false
    )
    TransactionMigrationMap.create!(
      user_id: user.id, legacy_table: legacy_table,
      legacy_id: payment.id, transaction_id: txn.id
    )
  rescue => e
    Rails.logger.warn("Payment sync_recurring_to_transaction_engine!: #{e.message}")
  end
end
