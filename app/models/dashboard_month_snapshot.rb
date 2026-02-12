class DashboardMonthSnapshot < ApplicationRecord
  belongs_to :user

  validates :year, presence: true, numericality: { only_integer: true }
  validates :month, presence: true, numericality: { only_integer: true, in: 1..12 }

  scope :for_period, ->(year, month) { where(year: year, month: month) }
  scope :active, -> { where(is_stale: false) }
end
