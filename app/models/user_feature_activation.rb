class UserFeatureActivation < ApplicationRecord
  belongs_to :user
  belongs_to :feature_block

  validates :user_id, uniqueness: { scope: :feature_block_id }

  scope :active, -> { where(deactivated_at: nil) }
  scope :inactive, -> { where.not(deactivated_at: nil) }
  scope :tutorial_completed, -> { where.not(tutorial_completed_at: nil) }

  def active?
    deactivated_at.nil?
  end

  def activate!
    update!(activated_at: Time.current, deactivated_at: nil)
  end

  def deactivate!
    update!(deactivated_at: Time.current)
  end
end
