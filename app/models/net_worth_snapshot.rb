class NetWorthSnapshot < ApplicationRecord
  belongs_to :user

  validates :snapshot_date, presence: true, uniqueness: { scope: :user_id }
  validates :amount, presence: true

  scope :recent, ->(count = 6) { order(snapshot_date: :desc).limit(count) }

  # Only return snapshots from the user's first meaningful data onward.
  # "Meaningful" = first month with a non-zero net worth, so the chart
  # doesn't start with a run of empty $0 months.  Falls back to the
  # user's creation month if no non-zero snapshot exists yet.
  scope :eligible_for_user, ->(user) {
    first_nonzero = user.net_worth_snapshots.where("amount != 0").minimum(:snapshot_date)
    cutoff = first_nonzero || user.created_at.beginning_of_month.to_date
    where("snapshot_date >= ?", cutoff)
  }

  # Read-only chart data: closed months from persisted snapshots (written by
  # soft close only) plus a live-computed current-month entry.
  # Does NOT write to the database. Safe to call on every dashboard load.
  def self.chart_data_for_user(user)
    om = OpenMonthMaster.for_user(user)
    current_month_end = Date.new(om.current_year, om.current_month, -1)

    # Read persisted snapshots from closed months (written by soft close only).
    # Exclude current open month — we always compute it live below.
    snapshots = user.net_worth_snapshots
                    .eligible_for_user(user)
                    .where.not(snapshot_date: current_month_end)
                    .order(snapshot_date: :desc)
                    .limit(5)
                    .to_a

    # Compute live current-month net worth (read-only — no database writes)
    live_nw = Account.net_worth_for(user.accounts, user: user)[:net_worth]
    if live_nw != 0
      virtual = user.net_worth_snapshots.build(snapshot_date: current_month_end, amount: live_nw)
      snapshots << virtual
    end

    snapshots.sort_by(&:snapshot_date).last(6)
  end
end
