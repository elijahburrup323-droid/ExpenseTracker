module Api
  class BugReportsController < BaseController
    def index
      page = (params[:page] || 1).to_i
      per_page = 5 # days at a time

      # Group by date, newest first
      all_dates = BugReport.order(processed_date: :desc).distinct.pluck(:processed_date)
      total_days = all_dates.size
      offset_days = (page - 1) * per_page
      date_window = all_dates[offset_days, per_page] || []

      reports = BugReport.where(processed_date: date_window).order(processed_date: :desc, created_at: :desc)

      render json: {
        reports: reports.map { |r| { id: r.id, screen_name: r.screen_name, description: r.description, processed_date: r.processed_date } },
        has_more: (offset_days + per_page) < total_days,
        page: page
      }
    end

    def create
      report = BugReport.new(bug_report_params)
      if report.save
        render json: { id: report.id, screen_name: report.screen_name, description: report.description, processed_date: report.processed_date }, status: :created
      else
        render json: { errors: report.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def bug_report_params
      params.require(:bug_report).permit(:screen_name, :description, :processed_date)
    end
  end
end
