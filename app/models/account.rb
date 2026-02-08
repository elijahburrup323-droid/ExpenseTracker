class Account < ApplicationRecord
  belongs_to :user
  belongs_to :account_type
  has_many :payments

  default_scope { where(deleted_at: nil) }

  scope :active, -> { where(deleted_at: nil) }
  scope :ordered, -> { order(:sort_order, :name) }

  validates :name, presence: true, length: { maximum: 80 }
  validates :name, uniqueness: {
    scope: :user_id,
    case_sensitive: false,
    conditions: -> { where(deleted_at: nil) },
    message: "has already been taken"
  }
  validates :institution, length: { maximum: 120 }
  validates :balance, numericality: true
  validates :beginning_balance, numericality: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end
end
