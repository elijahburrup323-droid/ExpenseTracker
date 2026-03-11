module Api
  class NetWorthSnapshotsController < BaseController
    def index
      # Read-only: closed months from snapshots (written by soft close), current month computed live
      snapshots = NetWorthSnapshot.chart_data_for_user(current_user)
      render json: snapshots.map { |s| { date: s.snapshot_date, amount: s.amount.to_f } }
    end

    # GET /api/net_worth_snapshots/breakdown?year=2026&month=3
    # Returns asset/liability line-item breakdown for a given month.
    # Current month → live data; past months → AccountMonthSnapshot.
    def breakdown
      year  = params[:year].to_i
      month = params[:month].to_i
      return render(json: { error: "Invalid date" }, status: :unprocessable_entity) unless (2020..2099).include?(year) && (1..12).include?(month)

      om = OpenMonthMaster.for_user(current_user)
      is_current = (year == om.current_year && month == om.current_month)

      credit_ids = AccountTypeMaster.where(normal_balance_type: "CREDIT").pluck(:id).to_set
      asset_items = []
      liability_items = []

      if is_current
        # Live data — mirrors dashboard controller logic
        accounts = current_user.accounts
        accounts.each do |a|
          if credit_ids.include?(a.account_type_master_id)
            next if a.balance.to_f.abs == 0
            liability_items << { name: a.name, value: a.balance.to_f.abs.round(2) }
          else
            next if a.balance.to_f == 0 && !AccountTypeMaster.liquid_type_ids.to_set.include?(a.account_type_master_id)
            asset_items << { name: a.name, value: a.balance.to_f.round(2) }
          end
        end

        if defined?(FEATURE_ASSETS_ENABLED) && FEATURE_ASSETS_ENABLED
          current_user.assets.where(include_in_net_worth: true).where(deleted_at: nil).each do |asset|
            next if asset.current_value.to_f == 0
            asset_items << { name: asset.name, value: asset.current_value.to_f.round(2) }
          end
        end

        if defined?(FEATURE_INVESTMENTS_ENABLED) && FEATURE_INVESTMENTS_ENABLED
          InvestmentHolding.joins(:investment_account)
            .where(investment_accounts: { user_id: current_user.id, include_in_net_worth: true, active: true })
            .where(investment_holdings: { deleted_at: nil }).where.not(investment_holdings: { current_price: nil })
            .includes(:investment_account).each do |h|
              val = (h.shares_held.to_f * h.current_price.to_f).round(2)
              next if val == 0
              label = h.ticker_symbol.present? ? "#{h.security_name} (#{h.ticker_symbol})" : h.security_name
              asset_items << { name: label, value: val }
            end
        end

        if defined?(FEATURE_FINANCING_ENABLED) && FEATURE_FINANCING_ENABLED
          current_user.financing_instruments.where(include_in_net_worth: true).where(deleted_at: nil).each do |fi|
            if fi.receivable?
              asset_items << { name: fi.name, value: fi.current_principal.to_f.round(2) } if fi.current_principal.to_f > 0
            else
              liability_items << { name: fi.name, value: fi.current_principal.to_f.round(2) } if fi.current_principal.to_f > 0
            end
          end
        end
      else
        # Historical — AccountMonthSnapshot ending balances
        snapshots = current_user.account_month_snapshots.active.for_period(year, month).includes(:account)
        snapshots.each do |snap|
          acct = snap.account
          next unless acct
          if credit_ids.include?(acct.account_type_master_id)
            next if snap.ending_balance.to_f.abs == 0
            liability_items << { name: acct.name, value: snap.ending_balance.to_f.abs.round(2) }
          else
            next if snap.ending_balance.to_f == 0
            asset_items << { name: acct.name, value: snap.ending_balance.to_f.round(2) }
          end
        end
      end

      asset_items.sort_by! { |i| -i[:value] }
      liability_items.sort_by! { |i| -i[:value] }
      total_assets = asset_items.sum { |i| i[:value] }
      total_liabilities = liability_items.sum { |i| i[:value] }

      render json: {
        year: year, month: month,
        assets: asset_items, liabilities: liability_items,
        total_assets: total_assets.round(2),
        total_liabilities: total_liabilities.round(2),
        net_worth: (total_assets - total_liabilities).round(2)
      }
    end

  end
end
