class ReportsSlotsMaster < ApplicationRecord
  self.primary_key = :slot_number

  has_one :reports_menu_layout, foreign_key: :slot_number, primary_key: :slot_number

  validates :slot_number, presence: true, uniqueness: true,
            numericality: { only_integer: true, greater_than: 0 }

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:slot_number) }

  def self.max_slot
    maximum(:slot_number) || 0
  end
end
