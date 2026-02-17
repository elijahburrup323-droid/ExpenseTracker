class SoftCloseController < ApplicationController
  before_action :authenticate_user!

  def index
    @open_month = OpenMonthMaster.for_user(current_user)
    @month_label = Date.new(@open_month.current_year, @open_month.current_month, 1).strftime("%B %Y")
    next_m = @open_month.current_month + 1
    next_y = @open_month.current_year
    if next_m > 12
      next_m = 1
      next_y += 1
    end
    @next_month_label = Date.new(next_y, next_m, 1).strftime("%B %Y")
  end
end
