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

  # Backfill missing NetWorthSnapshot records from AccountMonthSnapshot (the
  # reliable source that exists for every closed month) and upsert a live
  # current-month snapshot.  Idempotent — safe to call on every dashboard load.
  #
  # Only creates snapshots for months with non-zero net worth to avoid
  # cluttering the chart with empty $0 months from before the user had data.
  # Returns debug hash for troubleshooting (temporary).
  def self.backfill_for_user!(user)
    debug = { user_id: user.id, created_at: user.created_at.to_s }
    om = OpenMonthMaster.for_user(user)
    debug[:open_month] = "#{om.current_year}-#{om.current_month}"

    # --- Closed-month backfill from AccountMonthSnapshot ---
    credit_acct_ids = user.accounts.unscoped
                         .where(account_type_master_id: AccountTypeMaster.where(normal_balance_type: "CREDIT").select(:id))
                         .pluck(:id).to_set
    debug[:credit_acct_ids] = credit_acct_ids.to_a

    existing_dates = user.net_worth_snapshots.pluck(:snapshot_date).to_set
    debug[:existing_nw_dates] = existing_dates.map(&:to_s).sort

    closed_ams = user.account_month_snapshots.active
                     .where("year < :oy OR (year = :oy AND month < :om)",
                            oy: om.current_year, om: om.current_month)
    debug[:closed_ams_count] = closed_ams.count

    snaps_by_period = closed_ams.group_by { |s| [s.year, s.month] }
    debug[:periods_found] = snaps_by_period.keys.sort.map { |y, m| "#{y}-#{m}" }

    created = []
    skipped_existing = []
    skipped_zero = []

    snaps_by_period.each do |(y, m), period_snaps|
      month_end = Date.new(y, m, -1)
      if existing_dates.include?(month_end)
        skipped_existing << "#{y}-#{m}"
        next
      end

      asset_total = period_snaps.reject { |s| credit_acct_ids.include?(s.account_id) }
                                .sum { |s| s.ending_balance.to_f }
      liab_total  = period_snaps.select { |s| credit_acct_ids.include?(s.account_id) }
                                .sum { |s| s.ending_balance.to_f }
      nw = asset_total + liab_total

      if nw == 0
        skipped_zero << "#{y}-#{m}"
        next
      end

      user.net_worth_snapshots
          .find_or_initialize_by(snapshot_date: month_end)
          .update!(amount: nw)
      created << { period: "#{y}-#{m}", amount: nw.round(2) }
    end

    debug[:created] = created
    debug[:skipped_existing] = skipped_existing
    debug[:skipped_zero] = skipped_zero

    # --- Live current-month snapshot ---
    current_month_end = Date.new(om.current_year, om.current_month, -1)
    live_nw = Account.net_worth_for(user.accounts, user: user)[:net_worth]
    user.net_worth_snapshots
        .find_or_initialize_by(snapshot_date: current_month_end)
        .update!(amount: live_nw)
    debug[:live_month] = { date: current_month_end.to_s, amount: live_nw.round(2) }

    debug
  rescue ActiveRecord::RecordNotUnique
    retry
  end
end
