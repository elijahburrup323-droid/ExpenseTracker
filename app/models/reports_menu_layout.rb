class ReportsMenuLayout < ApplicationRecord
  belongs_to :reports_slots_master, foreign_key: :slot_number, primary_key: :slot_number
  belongs_to :reports_master, foreign_key: :report_key, primary_key: :report_key

  validates :slot_number, presence: true, uniqueness: true
  validates :report_key, presence: true, uniqueness: true

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { joins(:reports_slots_master).order("reports_slots_masters.slot_number") }
end
