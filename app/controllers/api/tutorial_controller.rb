module Api
  class TutorialController < BaseController
    def progress
      block = FeatureBlock.find_by!(key: params[:block_key])

      tp = UserTutorialProgress.find_or_initialize_by(
        user_id: current_user.id,
        feature_block_id: block.id
      )

      tp.current_step = params[:current_step].to_i
      tp.total_steps = params[:total_steps].to_i
      tp.status = params[:status]
      tp.started_at ||= Time.current
      tp.completed_at = Time.current if params[:status] == "completed"
      tp.save!

      # Also update the activation record
      if params[:status].in?(%w[completed skipped])
        activation = current_user.feature_activations.find_by(feature_block_id: block.id)
        if activation
          field = params[:status] == "completed" ? :tutorial_completed_at : :tutorial_skipped_at
          activation.update!(field => Time.current)
        end
      end

      render json: { status: tp.status, current_step: tp.current_step }
    end
  end
end
