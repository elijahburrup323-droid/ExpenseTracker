class LegalPagesAdminController < ApplicationController
  before_action :authenticate_user!
  before_action :require_agent

  def index
    @page = LegalPage.find_by!(slug: params[:slug])
  rescue ActiveRecord::RecordNotFound
    redirect_to root_path, alert: "Page not found"
  end

  private

  def require_agent
    unless current_user.budgethq_agent?
      redirect_to root_path, alert: "Access denied"
    end
  end
end
