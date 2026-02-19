class RecurringObligation < ApplicationRecord
  belongs_to :user
  belongs_to :account, optional: true
  belongs_to :spending_category, optional: true
  belongs_to :frequency_master, class_name: "IncomeFrequencyMaster"

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(use_flag: true) }
  scope :ordered, -> { order(:sort_order, :name) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :amount, presence: true, numericality: true
  validates :start_date, presence: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  # Determines if this obligation falls in a given year/month
  def falls_in_month?(year, month)
    month_end = Date.new(year, month, -1)
    return false if start_date > month_end

    fm = frequency_master
    case fm.frequency_type
    when "exact_day", "ordinal_weekday"
      true
    when "standard"
      falls_in_month_standard?(fm, year, month)
    else
      true
    end
  end

  # Calculate the due date within the given month
  def due_date_in_month(year, month)
    month_start = Date.new(year, month, 1)
    month_end = month_start.end_of_month

    if due_day.present?
      safe_day = [due_day, month_end.day].min
      return Date.new(year, month, safe_day)
    end

    fm = frequency_master
    case fm.frequency_type
    when "exact_day"
      if fm.is_last_day
        month_end
      else
        safe_day = [fm.day_of_month, month_end.day].min
        Date.new(year, month, safe_day)
      end
    when "ordinal_weekday"
      first_of_month = month_start
      target_wday = fm.weekday % 7 + 1
      first_occurrence = first_of_month
      first_occurrence += 1.day until first_occurrence.cwday == target_wday
      result = first_occurrence + ((fm.ordinal - 1) * 7).days
      result.month == month ? result : first_occurrence + (((fm.ordinal - 2).clamp(0, 3)) * 7).days
    else
      safe_day = [start_date.day, month_end.day].min
      Date.new(year, month, safe_day)
    end
  end

  private

  def falls_in_month_standard?(fm, year, month)
    case fm.name
    when "Weekly", "Bi-Weekly", "Every 4 Weeks", "Semi-Monthly",
         "Monthly", "Monthly (Variable Day)", "Irregular"
      true
    when "Quarterly"
      months_diff = (year * 12 + month) - (start_date.year * 12 + start_date.month)
      months_diff >= 0 && (months_diff % 3).zero?
    when "Semi-Annual"
      months_diff = (year * 12 + month) - (start_date.year * 12 + start_date.month)
      months_diff >= 0 && (months_diff % 6).zero?
    when "Annual"
      month == start_date.month && year >= start_date.year
    when "One-Time"
      year == start_date.year && month == start_date.month
    else
      true
    end
  end
end
