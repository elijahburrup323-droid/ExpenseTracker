module Admin
  class UsersController < ApplicationController
    before_action :authenticate_user!
    before_action :require_admin

    def index; end

    private

    def require_admin
      redirect_to dashboard_path, alert: "Access denied" unless current_user.budgethq_agent?
    end
  end
end
