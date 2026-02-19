module Api
  class TagsController < BaseController
    before_action :set_tag, only: [:update, :destroy]

    def index
      tags = current_user.tags.ordered
      render json: tags.map { |t| tag_json(t) }
    end

    def create
      max_sort = current_user.tags.maximum(:sort_order) || 0
      tag = current_user.tags.build(tag_params)
      tag.sort_order = max_sort + 1

      if tag.save
        render json: tag_json(tag), status: :created
      else
        render_errors(tag)
      end
    end

    def update
      if @tag.update(tag_params)
        render json: tag_json(@tag)
      else
        render_errors(@tag)
      end
    end

    def destroy
      @tag.soft_delete!
      head :no_content
    end

    private

    def set_tag
      @tag = current_user.tags.find_by(id: params[:id])
      render_not_found unless @tag
    end

    def tag_params
      params.require(:tag).permit(:name, :color_key)
    end

    def tag_json(t)
      t.as_json(only: [:id, :name, :color_key, :sort_order])
    end
  end
end
