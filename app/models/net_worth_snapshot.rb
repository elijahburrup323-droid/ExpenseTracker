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

  # Backfill missing NetWorthSnapshot records from AccountMonthSnapshot (the
  # reliable source that exists for every closed month) and upsert a live
  # current-month snapshot.  Idempotent — safe to call on every dashboard load.
  def self.backfill_for_user!(user)
    earliest = user.created_at.beginning_of_month.to_date

    # Prune any snapshots that predate the user's first eligible month
    user.net_worth_snapshots.where("snapshot_date < ?", earliest).delete_all

    om = OpenMonthMaster.for_user(user)

    # --- Closed-month backfill from AccountMonthSnapshot ---
    credit_acct_ids = user.accounts.unscoped
                         .where(account_type_master_id: AccountTypeMaster.where(normal_balance_type: "CREDIT").select(:id))
                         .pluck(:id).to_set

    existing_dates = user.net_worth_snapshots.pluck(:snapshot_date).to_set

    closed_ams = user.account_month_snapshots.active
                     .where("year < :oy OR (year = :oy AND month < :om)",
                            oy: om.current_year, om: om.current_month)

    snaps_by_period = closed_ams.group_by { |s| [s.year, s.month] }

    snaps_by_period.each do |(y, m), period_snaps|
      month_end = Date.new(y, m, -1)
      next if month_end < earliest
      next if existing_dates.include?(month_end)

      asset_total = period_snaps.reject { |s| credit_acct_ids.include?(s.account_id) }
                                .sum { |s| s.ending_balance.to_f }
      liab_total  = period_snaps.select { |s| credit_acct_ids.include?(s.account_id) }
                                .sum { |s| s.ending_balance.to_f }

      user.net_worth_snapshots
          .find_or_initialize_by(snapshot_date: month_end)
          .update!(amount: asset_total + liab_total)
    end

    # --- Live current-month snapshot ---
    current_month_end = Date.new(om.current_year, om.current_month, -1)
    live_nw = Account.net_worth_for(user.accounts, user: user)[:net_worth]
    user.net_worth_snapshots
        .find_or_initialize_by(snapshot_date: current_month_end)
        .update!(amount: live_nw)
  rescue ActiveRecord::RecordNotUnique
    retry
  end
end
