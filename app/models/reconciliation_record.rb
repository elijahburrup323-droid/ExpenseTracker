class ReconciliationRecord < ApplicationRecord
  belongs_to :user
  belongs_to :account

  validates :year, presence: true, numericality: { only_integer: true, greater_than: 2000 }
  validates :month, presence: true, numericality: { only_integer: true, in: 1..12 }
  validates :account_id, uniqueness: { scope: [:user_id, :year, :month] }
end
