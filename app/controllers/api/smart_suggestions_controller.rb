module Api
  class SmartSuggestionsController < BaseController
    def index
      suggestions = current_user.smart_suggestions.active.includes(:feature_block).order(:priority)
      render json: suggestions.map { |s|
        {
          id: s.id,
          block_key: s.feature_block.key,
          block_name: s.feature_block.display_name,
          reason_text: s.reason_text,
          priority: s.priority
        }
      }
    end

    def dismiss
      suggestion = current_user.smart_suggestions.find(params[:id])
      suggestion.dismiss!
      head :no_content
    end
  end
end
