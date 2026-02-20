class ReportsController < ApplicationController
  before_action :authenticate_user!

  def index
    UserReportLayout.seed_defaults_for(current_user)
    @slots = current_user.user_report_layouts.order(:slot_number)
    @open_month = OpenMonthMaster.for_user(current_user)
    @month_label = Date.new(@open_month.current_year, @open_month.current_month, 1).strftime("%B %Y")
  end

  def monthly_cash_flow
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def spending_by_category
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def recurring_obligations
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def spending_by_type
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def account_balance_history
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def income_by_source
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def net_worth_report
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def soft_close_summary
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def reconciliation_summary
    @open_month = OpenMonthMaster.for_user(current_user)
  end

  def spending_by_tag
    @open_month = OpenMonthMaster.for_user(current_user)
  end
end
