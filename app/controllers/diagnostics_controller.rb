class DiagnosticsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin

  def index
  end

  private

  def require_admin
    redirect_to dashboard_path, alert: "Admin access required" unless current_user.budgethq_agent?
  end
end
