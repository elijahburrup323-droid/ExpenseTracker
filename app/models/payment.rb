class Payment < ApplicationRecord
  belongs_to :user
  belongs_to :account
  belongs_to :spending_category
  belongs_to :spending_type_override, class_name: 'SpendingType', optional: true
  has_many :tag_assignments, as: :taggable, dependent: :destroy
  has_many :tags, through: :tag_assignments

  default_scope { where(deleted_at: nil) }

  scope :ordered, -> { order(payment_date: :desc, sort_order: :desc) }

  validates :description, presence: true, length: { maximum: 255 }
  validates :amount, presence: true, numericality: true
  validates :payment_date, presence: true

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end
end
