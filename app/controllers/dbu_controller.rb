class DbuController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!

  def index
  end

  private

  def require_admin!
    unless current_user.budgethq_agent?
      redirect_to dashboard_path, alert: "Admin access required."
    end
  end
end
