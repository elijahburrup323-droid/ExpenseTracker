module Api
  class AssetValuationsController < BaseController
    before_action :set_asset
    before_action :set_valuation, only: [:update, :destroy]

    def index
      valuations = @asset.asset_valuations.reverse_chronological
      render json: valuations.map { |v| valuation_json(v) }
    end

    def create
      valuation = AssetValuationService.add_valuation!(
        @asset,
        valuation_date: valuation_params[:valuation_date],
        value: valuation_params[:value],
        source: valuation_params[:source] || "manual",
        notes: valuation_params[:notes]
      )

      render json: valuation_json(valuation), status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    def update
      if @valuation.update(valuation_params)
        # Re-sync current_value to latest valuation
        latest = @asset.asset_valuations.reverse_chronological.first
        @asset.update_columns(current_value: latest.value, updated_at: Time.current) if latest

        render json: valuation_json(@valuation)
      else
        render_errors(@valuation)
      end
    end

    def destroy
      @valuation.soft_delete!

      # Re-sync current_value to latest remaining valuation
      latest = @asset.asset_valuations.reverse_chronological.first
      if latest
        @asset.update_columns(current_value: latest.value, updated_at: Time.current)
      end

      head :no_content
    end

    private

    def set_asset
      @asset = current_user.assets.find_by(id: params[:asset_id])
      render_not_found unless @asset
    end

    def set_valuation
      @valuation = @asset.asset_valuations.find_by(id: params[:id])
      render_not_found unless @valuation
    end

    def valuation_params
      params.require(:asset_valuation).permit(:valuation_date, :value, :source, :notes)
    end

    def valuation_json(v)
      v.as_json(only: [:id, :valuation_date, :value, :source, :notes, :created_at])
        .merge(asset_id: v.asset_id)
    end
  end
end
