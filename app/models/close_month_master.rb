class CloseMonthMaster < ApplicationRecord
  belongs_to :user
  belongs_to :closed_by_user, class_name: "User", optional: true

  validates :closed_year, presence: true, numericality: { only_integer: true, greater_than: 2000 }
  validates :closed_month, presence: true, numericality: { only_integer: true, in: 1..12 }
  validates :user_id, uniqueness: { scope: [:closed_year, :closed_month], message: "already has a close record for this month" }
end
