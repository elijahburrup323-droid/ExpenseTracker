module Api
  class OpenMonthMastersController < BaseController
    def show
      record = OpenMonthMaster.for_user(current_user)
      render json: record.as_json(only: [:id, :user_id, :current_year, :current_month, :is_closed, :locked_at, :locked_by_user_id])
    end

    def update
      record = OpenMonthMaster.for_user(current_user)

      if record.update(open_month_params)
        render json: record.as_json(only: [:id, :user_id, :current_year, :current_month, :is_closed, :locked_at, :locked_by_user_id])
      else
        render_errors(record)
      end
    end

    private

    def open_month_params
      params.require(:open_month_master).permit(:current_year, :current_month)
    end
  end
end
