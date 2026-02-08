class IncomeRecurring < ApplicationRecord
  belongs_to :user
  belongs_to :account, optional: true
  belongs_to :frequency_master, class_name: "IncomeFrequencyMaster"

  has_many :income_entries

  default_scope { where(deleted_at: nil) }

  scope :ordered, -> { order(:sort_order, :name) }
  scope :due, -> { where("next_date <= ?", Date.today).where(use_flag: true) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :amount, presence: true, numericality: true
  validates :next_date, presence: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def advance_next_date!
    new_date = frequency_master.next_date_from(next_date)
    update!(next_date: new_date)
  end
end
