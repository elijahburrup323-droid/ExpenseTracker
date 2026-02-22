module Api
  class TextScaleController < BaseController
    MIN_SCALE = 80
    MAX_SCALE = 130

    # PUT /api/text_scale
    def update
      percent = params[:text_scale_percent].to_i.clamp(MIN_SCALE, MAX_SCALE)
      # Round to nearest 5
      percent = (percent / 5.0).round * 5

      if current_user.text_scale_percent == percent
        return render json: { text_scale_percent: percent, changed: false }
      end

      current_user.update!(text_scale_percent: percent)
      render json: { text_scale_percent: percent, changed: true }
    end
  end
end
