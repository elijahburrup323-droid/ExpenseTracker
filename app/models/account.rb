class Account < ApplicationRecord
  belongs_to :user
  belongs_to :account_type
  belongs_to :account_type_master, optional: true
  has_many :payments
  has_many :income_entries
  has_many :transfers_from, class_name: "TransferMaster", foreign_key: :from_account_id
  has_many :transfers_to, class_name: "TransferMaster", foreign_key: :to_account_id
  has_many :buckets
  has_many :balance_adjustments
  has_many :tag_assignments, as: :taggable, dependent: :destroy
  has_many :tags, through: :tag_assignments

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

  def buckets_enabled?
    buckets.active.exists?
  end

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end
end
