module Api
  class QuotesController < BaseController
    before_action :require_admin!
    before_action :set_quote, only: [:update, :destroy]
    after_action :invalidate_quote_cache, only: [:create, :update, :destroy]

    def index
      quotes = Quote.order(created_at: :desc)
      render json: quotes.as_json(only: [:id, :quote_text, :quote_author, :is_active])
    end

    def create
      quote = Quote.new(quote_params)

      if quote.save
        render json: quote.as_json(only: [:id, :quote_text, :quote_author, :is_active]), status: :created
      else
        render_errors(quote)
      end
    end

    def update
      if @quote.update(quote_params)
        render json: @quote.as_json(only: [:id, :quote_text, :quote_author, :is_active])
      else
        render_errors(@quote)
      end
    end

    def destroy
      @quote.destroy!
      head :no_content
    end

    private

    def require_admin!
      unless current_user.budgethq_agent?
        render json: { error: "Admin access required" }, status: :forbidden
      end
    end

    def set_quote
      @quote = Quote.find_by(id: params[:id])
      render_not_found unless @quote
    end

    def quote_params
      params.require(:quote).permit(:quote_text, :quote_author, :is_active)
    end

    def invalidate_quote_cache
      Quote.invalidate_cache!
    end
  end
end
