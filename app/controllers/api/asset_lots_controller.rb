module Api
  class AssetLotsController < BaseController
    include FeatureGate
    before_action -> { require_feature!("assets") }
    before_action :set_asset
    before_action :set_lot, only: [:update, :destroy]

    def index
      lots = @asset.asset_lots.reverse_chronological
      render json: lots.map { |l| lot_json(l) }
    end

    def create
      lot = @asset.asset_lots.build(lot_params)
      lot.user = current_user

      ActiveRecord::Base.transaction do
        if lot.save
          @asset.recalculate_from_lots!
          render json: lot_json(lot), status: :created
        else
          render_errors(lot)
        end
      end
    end

    def update
      ActiveRecord::Base.transaction do
        if @lot.update(lot_params)
          @asset.recalculate_from_lots!
          render json: lot_json(@lot)
        else
          render_errors(@lot)
        end
      end
    end

    def destroy
      ActiveRecord::Base.transaction do
        @lot.soft_delete!
        @asset.recalculate_from_lots!
      end
      head :no_content
    end

    private

    def set_asset
      @asset = current_user.assets.find_by(id: params[:asset_id])
      render_not_found unless @asset
    end

    def set_lot
      @lot = @asset.asset_lots.find_by(id: params[:id])
      render_not_found unless @lot
    end

    def lot_params
      params.require(:asset_lot).permit(:acquired_date, :quantity, :price_per_unit, :notes, :entry_form, :entry_quantity)
    end

    def lot_json(l)
      l.as_json(only: [:id, :acquired_date, :quantity, :price_per_unit, :total_cost, :notes, :entry_form, :entry_quantity, :created_at])
        .merge(asset_id: l.asset_id)
    end
  end
end
