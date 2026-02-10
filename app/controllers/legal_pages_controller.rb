class LegalPagesController < ApplicationController
  def show
    @page = LegalPage.published.find_by_slug!(params[:slug])
  rescue ActiveRecord::RecordNotFound
    redirect_to root_path, alert: "Page not found"
  end
end
