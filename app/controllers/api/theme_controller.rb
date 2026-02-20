module Api
  class ThemeController < BaseController
    VALID_THEMES = %w[purple navy teal charcoal deep_green burgundy].freeze

    # PUT /api/theme
    def update
      theme_key = params[:accent_theme_key].to_s.strip
      unless VALID_THEMES.include?(theme_key)
        return render json: { error: "Invalid theme: #{theme_key}" }, status: :unprocessable_entity
      end

      if current_user.accent_theme_key == theme_key
        return render json: { accent_theme_key: theme_key, changed: false }
      end

      current_user.update!(accent_theme_key: theme_key)
      render json: { accent_theme_key: theme_key, changed: true }
    end
  end
end
