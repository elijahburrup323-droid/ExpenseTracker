class BalanceAdjustment < ApplicationRecord
  belongs_to :user
  belongs_to :account

  default_scope { where(deleted_at: nil) }

  validates :description, presence: true, length: { maximum: 255 }
  validates :amount, presence: true, numericality: true
  validates :adjustment_date, presence: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end
end
