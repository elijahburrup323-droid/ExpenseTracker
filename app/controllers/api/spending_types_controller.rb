module Api
  class SpendingTypesController < BaseController
    before_action :set_spending_type, only: [:update, :destroy]

    def index
      spending_types = current_user.spending_types.ordered
      render json: spending_types.as_json(only: [:id, :name, :description, :icon_key, :color_key, :sort_order, :is_system, :is_active])
    end

    def create
      max_sort = current_user.spending_types.maximum(:sort_order) || 0
      spending_type = current_user.spending_types.build(spending_type_params)
      spending_type.sort_order = max_sort + 1

      if spending_type.save
        render json: spending_type.as_json(only: [:id, :name, :description, :icon_key, :color_key, :sort_order, :is_system, :is_active]), status: :created
      else
        render_errors(spending_type)
      end
    end

    def update
      if @spending_type.update(spending_type_params)
        render json: @spending_type.as_json(only: [:id, :name, :description, :icon_key, :color_key, :sort_order, :is_system, :is_active])
      else
        render_errors(@spending_type)
      end
    end

    def destroy
      @spending_type.soft_delete!
      head :no_content
    end

    private

    def set_spending_type
      @spending_type = current_user.spending_types.find_by(id: params[:id])
      render_not_found unless @spending_type
    end

    def spending_type_params
      params.require(:spending_type).permit(:name, :description, :icon_key, :color_key)
    end
  end
end
