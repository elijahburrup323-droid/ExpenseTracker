module Api
  class SidebarStateController < BaseController
    # PUT /api/sidebar_state
    def update
      raw = params[:sidebar_state]
      unless raw.is_a?(ActionController::Parameters) || raw.is_a?(Hash)
        return render json: { error: "Invalid sidebar_state" }, status: :unprocessable_entity
      end

      state = raw.to_unsafe_h.slice("isSidebarCollapsed", "expandedSections", "version")
      current_user.update_column(:sidebar_state_json, state.to_json)
      render json: { saved: true }
    end
  end
end
