module Api
  class SpendingCategoriesController < BaseController
    before_action :set_spending_category, only: [:update, :destroy]

    def index
      categories = current_user.spending_categories.includes(:spending_type, :tags).ordered
      render json: categories.map { |c| category_json(c) }
    end

    def create
      max_sort = current_user.spending_categories.maximum(:sort_order) || 0
      category = current_user.spending_categories.build(create_params)
      category.sort_order = max_sort + 1

      if category.save
        sync_category_tags!(category)
        render json: category_json(category), status: :created
      else
        render_errors(category)
      end
    end

    def update
      if @spending_category.update(update_params)
        sync_category_tags!(@spending_category)
        render json: category_json(@spending_category)
      else
        render_errors(@spending_category)
      end
    end

    def destroy
      if @spending_category.payments.exists?
        return render json: { errors: ["This category cannot be deleted because payments are associated with it. Please reassign or remove those payments before deleting the category."] }, status: :unprocessable_entity
      end
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

    def category_json(c)
      c.as_json(only: [:id, :name, :description, :spending_type_id, :is_debt, :icon_key, :color_key, :sort_order])
        .merge(
          "spending_type_name" => c.spending_type.name,
          "default_tag_ids" => c.tags.map(&:id)
        )
    end

    def sync_category_tags!(category)
      tag_ids = (params.dig(:spending_category, :tag_ids) || []).map(&:to_i).uniq
      valid_tag_ids = current_user.tags.where(id: tag_ids).pluck(:id)
      category.tag_assignments.destroy_all
      valid_tag_ids.each do |tid|
        category.tag_assignments.create!(user: current_user, tag_id: tid)
      end
    end
  end
end
