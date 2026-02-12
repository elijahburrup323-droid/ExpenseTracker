module Api
  class OpenMonthMastersController < BaseController
    def show
      record = OpenMonthMaster.for_user(current_user)
      render json: open_month_json(record)
    end

    def update
      record = OpenMonthMaster.for_user(current_user)

      ActiveRecord::Base.transaction do
        old_year = record.current_year
        old_month = record.current_month

        if record.update(open_month_params)
          # If month/year changed, generate snapshots for old month and reset has_data
          if record.current_year != old_year || record.current_month != old_month
            # Temporarily restore old month to generate snapshots
            record.update_columns(current_year: old_year, current_month: old_month)
            record.generate_snapshots!
            # Now advance to the new month
            record.update_columns(
              current_year: open_month_params[:current_year] || record.current_year,
              current_month: open_month_params[:current_month] || record.current_month,
              has_data: false,
              first_data_at: nil,
              first_data_source: nil,
              is_closed: false
            )
          end

          render json: open_month_json(record.reload)
        else
          render_errors(record)
          raise ActiveRecord::Rollback
        end
      end
    end

    # POST /api/open_month_master/close
    def close
      record = OpenMonthMaster.for_user(current_user)

      if record.is_closed
        return render json: { error: "Month is already closed" }, status: :unprocessable_entity
      end

      ActiveRecord::Base.transaction do
        record.generate_snapshots!
        record.update!(
          is_closed: true,
          locked_at: Time.current,
          locked_by_user_id: current_user.id
        )
      end

      render json: open_month_json(record)
    end

    # POST /api/open_month_master/reopen
    def reopen
      record = OpenMonthMaster.for_user(current_user)

      if record.has_data
        return render json: {
          error: "REOPEN_BLOCKED_NEW_MONTH_HAS_DATA",
          message: "You cannot reopen the previous month because entries already exist in the current month."
        }, status: :unprocessable_entity
      end

      begin
        record.reopen_previous_month!(current_user)
        render json: open_month_json(record.reload)
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end

    private

    def open_month_params
      params.require(:open_month_master).permit(:current_year, :current_month)
    end

    def open_month_json(record)
      record.as_json(only: [
        :id, :user_id, :current_year, :current_month, :is_closed,
        :locked_at, :locked_by_user_id, :has_data, :first_data_at,
        :first_data_source, :reopen_count, :last_reopened_at
      ])
    end
  end
end
