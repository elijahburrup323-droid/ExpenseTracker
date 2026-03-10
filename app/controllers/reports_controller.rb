class ReportsController < ApplicationController
  before_action :authenticate_user!

  def index; end

  def monthly_cash_flow;       redirect_to reports_path; end
  def spending_by_category;    redirect_to reports_path; end
  def recurring_obligations;   redirect_to reports_path; end
  def spending_by_type;        redirect_to reports_path; end
  def account_balance_history; redirect_to reports_path; end
  def income_by_source;        redirect_to reports_path; end
  def net_worth_report;        redirect_to reports_path; end
  def soft_close_summary;      redirect_to reports_path; end
  def reconciliation_summary;  redirect_to reports_path; end
  def spending_by_tag;         redirect_to reports_path; end
  def monthly_snapshot_audit;  redirect_to reports_path; end
end
