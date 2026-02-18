class ReconciliationGroupUiState < ApplicationRecord
  belongs_to :user
  belongs_to :account

  VALID_GROUP_TYPES = %w[payments deposits transfers adjustments].freeze

  validates :year, presence: true
  validates :month, presence: true, inclusion: { in: 1..12 }
  validates :group_type, presence: true, inclusion: { in: VALID_GROUP_TYPES }
  validates :user_id, uniqueness: { scope: [:account_id, :year, :month, :group_type] }
end
