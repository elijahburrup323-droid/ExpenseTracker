class NetWorthSnapshot < ApplicationRecord
  belongs_to :user

  validates :snapshot_date, presence: true, uniqueness: { scope: :user_id }
  validates :amount, presence: true

  scope :recent, ->(count = 6) { order(snapshot_date: :desc).limit(count) }

  # Only return snapshots from the user's first eligible month onward.
  # Earliest eligible = beginning of user's creation month.
  scope :eligible_for_user, ->(user) {
    earliest = user.created_at.beginning_of_month.to_date
    where("snapshot_date >= ?", earliest)
  }
end
