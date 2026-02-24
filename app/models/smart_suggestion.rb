class SmartSuggestion < ApplicationRecord
  belongs_to :user
  belongs_to :feature_block

  validates :rule_key, presence: true
  validates :status, inclusion: { in: %w[pending shown accepted dismissed resolved] }

  scope :pending, -> { where(status: %w[pending shown]) }
  scope :dismissed, -> { where(status: "dismissed") }
  scope :active, -> { pending.where("dismissed_at IS NULL OR dismissed_at < ?", 7.days.ago) }

  def dismiss!
    update!(status: "dismissed", dismissed_at: Time.current)
  end

  def accept!
    update!(status: "accepted")
  end

  def resolve!
    update!(status: "resolved")
  end
end
