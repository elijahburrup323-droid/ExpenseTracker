module Api
  class SpendingCategoriesController < BaseController
    before_action :set_spending_category, only: [:update, :destroy]

    def index
      categories = current_user.spending_categories.includes(:spending_type).ordered
      render json: categories.map { |c|
        c.as_json(only: [:id, :name, :description, :spending_type_id, :is_debt, :icon_key, :color_key, :sort_order])
          .merge("spending_type_name" => c.spending_type.name)
      }
    end

    def create
      max_sort = current_user.spending_categories.maximum(:sort_order) || 0
      category = current_user.spending_categories.build(create_params)
      category.sort_order = max_sort + 1

      if category.save
        render json: category.as_json(only: [:id, :name, :description, :spending_type_id, :is_debt, :icon_key, :color_key, :sort_order])
          .merge("spending_type_name" => category.spending_type.name),
          status: :created
      else
        render_errors(category)
      end
    end

    def update
      if @spending_category.update(update_params)
        render json: @spending_category.as_json(only: [:id, :name, :description, :spending_type_id, :is_debt, :icon_key, :color_key, :sort_order])
          .merge("spending_type_name" => @spending_category.spending_type.name)
      else
        render_errors(@spending_category)
      end
    end

    def destroy
      @spending_category.soft_delete!
      head :no_content
    end

    private

    def set_spending_category
      @spending_category = current_user.spending_categories.find_by(id: params[:id])
      render_not_found unless @spending_category
    end

    def create_params
      params.require(:spending_category).permit(:name, :description, :spending_type_id, :is_debt, :icon_key, :color_key)
    end

    def update_params
      params.require(:spending_category).permit(:name, :description, :spending_type_id, :is_debt, :icon_key, :color_key)
    end
  end
end
