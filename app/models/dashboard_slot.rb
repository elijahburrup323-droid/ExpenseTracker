class DashboardSlot < ApplicationRecord
  belongs_to :user
  belongs_to :dashboard_card, optional: true

  validates :slot_number, presence: true,
            numericality: { only_integer: true, in: 1..6 }
  validates :slot_number, uniqueness: { scope: :user_id }
end
