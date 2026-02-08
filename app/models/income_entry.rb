class IncomeEntry < ApplicationRecord
  belongs_to :user
  belongs_to :income_recurring, optional: true
  belongs_to :account, optional: true
  belongs_to :frequency_master, class_name: "IncomeFrequencyMaster", optional: true

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
      generated << entry
      recurring.advance_next_date!
    end
    generated
  end
end
