module Api
  class AssetsController < BaseController
    include FeatureGate
    before_action -> { require_feature!("assets") }
    before_action :set_asset, only: [:show, :update, :destroy]

    def index
      assets = current_user.assets.ordered.includes(:asset_type)
      render json: assets.map { |a| asset_json(a) }
    end

    def show
      render json: asset_json(@asset)
    end

    def create
      max_sort = current_user.assets.maximum(:sort_order) || 0
      asset = current_user.assets.build(asset_params)
      asset.sort_order = max_sort + 1

      ActiveRecord::Base.transaction do
        if asset.save
          # If unit-based and first_lot params provided, create the initial lot
          if asset.unit_based? && params[:first_lot].present?
            lot_data = params.require(:first_lot).permit(:acquired_date, :quantity, :price_per_unit, :notes, :entry_form, :entry_quantity)
            asset.asset_lots.create!(
              user: current_user,
              acquired_date: lot_data[:acquired_date],
              quantity: lot_data[:quantity],
              price_per_unit: lot_data[:price_per_unit],
              notes: lot_data[:notes],
              entry_form: lot_data[:entry_form],
              entry_quantity: lot_data[:entry_quantity]
            )
            asset.recalculate_from_lots!
          end
          render json: asset_json(asset.reload), status: :created
        else
          render_errors(asset)
        end
      end
    end

    def update
      if @asset.update(asset_params)
        # If user updated current_price_per_unit on a unit-based asset, recalculate current_value
        if @asset.unit_based? && @asset.saved_change_to_attribute?(:current_price_per_unit) && @asset.total_quantity.to_d > 0
          @asset.update_columns(
            current_value: (@asset.total_quantity * @asset.current_price_per_unit).round(2),
            updated_at: Time.current
          )
          @asset.reload
        end
        render json: asset_json(@asset)
      else
        render_errors(@asset)
      end
    end

    def destroy
      if @asset.asset_valuations.exists?
        return render json: { blocked: true, reason: "valuations" }, status: :conflict
      end

      if @asset.asset_lots.exists?
        return render json: { blocked: true, reason: "lots" }, status: :conflict
      end

      @asset.soft_delete!
      head :no_content
    end

    private

    def set_asset
      @asset = current_user.assets.find_by(id: params[:id])
      render_not_found unless @asset
    end

    def asset_params
      params.require(:asset).permit(
        :name, :asset_type_id, :description, :current_value,
        :purchase_price, :purchase_date, :include_in_net_worth, :notes,
        :depreciation_method, :annual_rate, :useful_life_years, :projection_enabled,
        :unit_label, :current_price_per_unit
      )
    end

    def asset_json(a)
      a.as_json(only: [:id, :name, :description, :current_value, :purchase_price,
                        :purchase_date, :include_in_net_worth, :notes, :sort_order,
                        :depreciation_method, :annual_rate, :useful_life_years, :projection_enabled,
                        :total_quantity, :total_cost_basis, :current_price_per_unit, :unit_label])
        .merge(
          asset_type_id: a.asset_type_id,
          asset_type_name: a.asset_type&.name || "",
          asset_type_key: a.asset_type&.normalized_key || "",
          unit_based: a.unit_based?,
          projected_value: a.projected_value&.round(2),
          five_year_projection: a.five_year_projection,
          lot_count: a.unit_based? ? a.asset_lots.count : 0,
          unrealized_gain: a.unit_based? && a.total_cost_basis.present? && a.total_cost_basis.to_d > 0 ?
            (a.current_value.to_d - a.total_cost_basis.to_d).round(2) : nil
        )
    end
  end
end
