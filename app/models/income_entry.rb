class IncomeEntry < ApplicationRecord
  belongs_to :user
  belongs_to :income_recurring, optional: true
  belongs_to :account, optional: true
  belongs_to :frequency_master, class_name: "IncomeFrequencyMaster", optional: true

  has_many :tag_assignments, as: :taggable, dependent: :destroy
  has_many :tags, through: :tag_assignments

  default_scope { where(deleted_at: nil) }

  scope :ordered, -> { order(entry_date: :desc, sort_order: :asc) }

  validates :source_name, presence: true, length: { maximum: 80 }
  validates :amount, presence: true, numericality: true
  validates :entry_date, presence: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def self.generate_due_entries_for(user)
    generated = []
    user.income_recurrings.due.each do |recurring|
      # Prevent duplicate: skip if an entry already exists for this recurring + date
      next if user.income_entries.exists?(income_recurring_id: recurring.id, entry_date: recurring.next_date)

      entry = user.income_entries.create!(
        income_recurring: recurring,
        source_name: recurring.name,
        description: recurring.description,
        entry_date: recurring.next_date,
        amount: recurring.amount,
        account_id: recurring.account_id,
        frequency_master_id: recurring.frequency_master_id,
        received_flag: false,
        sort_order: recurring.sort_order
      )
      sync_recurring_to_transaction_engine!(user, entry, "income_entries")
      generated << entry
      recurring.advance_next_date!
    end
    generated
  end

  def self.sync_recurring_to_transaction_engine!(user, entry, legacy_table)
    txn = user.transactions.create!(
      txn_date: entry.entry_date,
      txn_type: "deposit",
      amount: entry.amount.abs,
      description: entry.source_name,
      memo: entry.description,
      account_id: entry.account_id,
      reconciled: false
    )
    TransactionMigrationMap.create!(
      user_id: user.id, legacy_table: legacy_table,
      legacy_id: entry.id, transaction_id: txn.id
    )
  rescue => e
    Rails.logger.warn("IncomeEntry sync_recurring_to_transaction_engine!: #{e.message}")
  end
end
