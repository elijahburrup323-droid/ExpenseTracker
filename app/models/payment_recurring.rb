class PaymentRecurring < ApplicationRecord
  belongs_to :user
  belongs_to :account
  belongs_to :spending_category
  belongs_to :frequency_master, class_name: "IncomeFrequencyMaster"

  has_many :payments

  default_scope { where(deleted_at: nil) }

  scope :ordered, -> { order(:sort_order, :name) }
  scope :due, -> { where("next_date <= ?", Date.today).where(use_flag: true) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :next_date, presence: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def advance_next_date!
    new_date = frequency_master.next_date_from(next_date)
    update!(next_date: new_date)
  end

  # Returns the number of occurrences this recurring payment produces in the given month.
  def occurrences_in_month(year, month)
    return 0 unless next_date
    month_start = Date.new(year, month, 1)
    month_end = month_start.end_of_month
    fm = frequency_master

    # Interval-based: weekly, biweekly, every 4 weeks
    if fm.interval_days.present? && fm.interval_days > 0
      interval = fm.interval_days
      cursor = next_date
      cursor -= interval while cursor > month_start
      count = 0
      while cursor <= month_end
        count += 1 if cursor >= month_start
        cursor += interval
      end
      return count
    end

    case fm.frequency_type
    when "exact_day", "ordinal_weekday"
      1
    when "standard"
      case fm.name
      when "Semi-Monthly"
        2
      when "Monthly", "Monthly (Variable Day)", "Irregular"
        1
      when "Quarterly"
        months_diff = (year * 12 + month) - (next_date.year * 12 + next_date.month)
        (months_diff % 3).zero? ? 1 : 0
      when "Semi-Annual"
        months_diff = (year * 12 + month) - (next_date.year * 12 + next_date.month)
        (months_diff % 6).zero? ? 1 : 0
      when "Annual"
        month == next_date.month ? 1 : 0
      when "One-Time"
        (year == next_date.year && month == next_date.month) ? 1 : 0
      else
        1
      end
    else
      1
    end
  end

  def planned_amount_in_month(year, month)
    amount.to_f * occurrences_in_month(year, month)
  end
end
