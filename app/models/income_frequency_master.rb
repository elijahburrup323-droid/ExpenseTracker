class IncomeFrequencyMaster < ApplicationRecord
  validates :name, presence: true
  validates :frequency_type, presence: true, inclusion: { in: %w[standard exact_day ordinal_weekday] }
  validates :sort_order, presence: true

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:sort_order) }

  has_many :income_user_frequencies, foreign_key: :frequency_master_id
  has_many :income_recurrings, foreign_key: :frequency_master_id
  has_many :income_entries, foreign_key: :frequency_master_id
  has_many :recurring_obligations, foreign_key: :frequency_master_id

  def in_use?
    income_user_frequencies.exists? || income_recurrings.exists? || income_entries.exists? || recurring_obligations.exists?
  end

  def next_date_from(date)
    case frequency_type
    when "standard"
      next_date_standard(date)
    when "exact_day"
      next_date_exact_day(date)
    when "ordinal_weekday"
      next_date_ordinal_weekday(date)
    else
      date + 30.days
    end
  end

  private

  def next_date_standard(date)
    return date + interval_days.days if interval_days.present? && interval_days > 0

    case name
    when "Semi-Monthly"
      if date.day < 15
        date.change(day: 15)
      else
        (date + 1.month).change(day: 1)
      end
    when "Monthly", "Monthly (Variable Day)"
      date + 1.month
    when "Quarterly"
      date + 3.months
    when "Semi-Annual"
      date + 6.months
    when "Annual"
      date + 1.year
    when "One-Time"
      date
    when "Irregular"
      date + 30.days
    else
      date + 1.month
    end
  end

  def next_date_exact_day(date)
    if is_last_day
      next_month = date + 1.month
      return next_month.end_of_month
    end

    target_day = day_of_month
    next_month = date + 1.month
    safe_day = [target_day, next_month.end_of_month.day].min
    next_month.change(day: safe_day)
  end

  def next_date_ordinal_weekday(date)
    next_month = date + 1.month
    first_of_month = next_month.beginning_of_month
    target_wday = weekday # 1=Mon..5=Fri
    ruby_wday = target_wday % 7 + 1 # convert to Ruby's cwday (1=Mon..7=Sun)

    first_occurrence = first_of_month
    until first_occurrence.cwday == ruby_wday
      first_occurrence += 1.day
    end

    result = first_occurrence + ((ordinal - 1) * 7).days
    result.month == next_month.month ? result : first_occurrence + (((ordinal - 2).clamp(0, 3)) * 7).days
  end
end
