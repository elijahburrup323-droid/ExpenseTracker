class AssetsController < ApplicationController
  include FeatureGate
  before_action :authenticate_user!
  before_action -> { require_feature!("assets") }

  def index
    assets = current_user.assets.includes(:asset_type)

    @total_asset_value = assets.where(include_in_net_worth: true).sum(:current_value)
    @total_excluded    = assets.where(include_in_net_worth: false).sum(:current_value)
    @asset_count       = assets.count

    # Group by asset type for breakdown
    @type_breakdown = assets.group_by(&:asset_type).map do |asset_type, type_assets|
      {
        name: asset_type&.name || "Uncategorized",
        icon_key: asset_type&.icon_key,
        count: type_assets.size,
        total: type_assets.sum { |a| a.current_value.to_d }
      }
    end.sort_by { |t| -t[:total] }
  end

  def list
  end

  def show
    @asset = current_user.assets.includes(:asset_type).find_by(id: params[:id])
    redirect_to assets_list_path, alert: "Asset not found" unless @asset
  end
end
