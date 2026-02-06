class HomeController < ApplicationController
  def index
    if user_signed_in?
      redirect_to dashboard_path
    else
      render :index
    end
  end
end
