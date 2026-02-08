class IncomeFrequencyMastersController < ApplicationController
  before_action :authenticate_user!
  before_action :require_agent

  def index
  end

  private

  def require_agent
    redirect_to dashboard_path, alert: "Access denied" unless current_user.budgethq_agent?
  end
end
