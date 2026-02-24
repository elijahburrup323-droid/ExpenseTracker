class UserTutorialProgress < ApplicationRecord
  belongs_to :user
  belongs_to :feature_block

  validates :user_id, uniqueness: { scope: :feature_block_id }
  validates :status, inclusion: { in: %w[pending in_progress completed skipped] }

  scope :in_progress, -> { where(status: "in_progress") }
  scope :completed, -> { where(status: "completed") }

  def completed?
    status == "completed"
  end

  def skipped?
    status == "skipped"
  end
end
