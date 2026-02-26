module Api
  class AssetsController < BaseController
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

      if asset.save
        render json: asset_json(asset), status: :created
      else
        render_errors(asset)
      end
    end

    def update
      if @asset.update(asset_params)
        render json: asset_json(@asset)
      else
        render_errors(@asset)
      end
    end

    def destroy
      if @asset.asset_valuations.exists?
        return render json: {
          blocked: true,
          has_valuations: true
        }, status: :conflict
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
        :purchase_price, :purchase_date, :include_in_net_worth, :notes
      )
    end

    def asset_json(a)
      a.as_json(only: [:id, :name, :description, :current_value, :purchase_price,
                        :purchase_date, :include_in_net_worth, :notes, :sort_order])
        .merge(
          asset_type_id: a.asset_type_id,
          asset_type_name: a.asset_type&.name || ""
        )
    end
  end
end
