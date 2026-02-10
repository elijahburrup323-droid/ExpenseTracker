module Api
  class NetWorthSnapshotsController < BaseController
    before_action :require_admin, only: [:populate]

    def index
      snapshots = current_user.net_worth_snapshots.recent(6).order(snapshot_date: :asc)
      render json: snapshots.map { |s| { date: s.snapshot_date, amount: s.amount.to_f } }
    end

    # POST /api/net_worth_snapshots/populate
    # params: { months_back: 1..12 }
    def populate
      months_back = params[:months_back].to_i.clamp(1, 12)
      current_net_worth = current_user.accounts.sum(:balance).to_f

      records_created = 0
      months_back.downto(1) do |i|
        snapshot_date = (Date.today - i.months).end_of_month
        # Generate realistic variation: random fluctuation around current net worth
        variation = current_net_worth * rand(-0.15..0.05) * (i.to_f / months_back)
        amount = (current_net_worth - (current_net_worth * 0.03 * i) + variation).round(2)

        snapshot = current_user.net_worth_snapshots.find_or_initialize_by(snapshot_date: snapshot_date)
        snapshot.amount = amount
        snapshot.save!
        records_created += 1
      end

      # Also snapshot current month
      current_snapshot = current_user.net_worth_snapshots.find_or_initialize_by(snapshot_date: Date.today.end_of_month)
      current_snapshot.amount = current_net_worth
      current_snapshot.save!
      records_created += 1

      render json: { message: "Created #{records_created} snapshots for #{months_back} months back", count: records_created }
    end

    private

    def require_admin
      render json: { error: "Access denied" }, status: :forbidden unless current_user.budgethq_agent?
    end
  end
end
