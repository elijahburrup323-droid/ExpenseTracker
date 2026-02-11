class TransferMaster < ApplicationRecord
  belongs_to :user
  belongs_to :from_account, class_name: "Account"
  belongs_to :to_account, class_name: "Account"

  validates :transfer_date, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :memo, length: { maximum: 255 }
  validate :accounts_must_differ

  scope :ordered, -> { order(transfer_date: :desc, created_at: :desc) }

  private

  def accounts_must_differ
    if from_account_id.present? && from_account_id == to_account_id
      errors.add(:to_account_id, "must be different from the From account")
    end
  end
end
