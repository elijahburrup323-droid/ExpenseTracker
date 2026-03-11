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
          # Reset state when month changes (no snapshot writes — only soft close writes snapshots)
          if record.current_year != old_year || record.current_month != old_month
            record.update_columns(
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

    # POST /api/open_month_master/close  (Soft Close: snapshot + advance to next month)
    def close
      record = OpenMonthMaster.for_user(current_user)
      record.soft_close!(current_user)
      render json: open_month_json(record.reload)
    rescue => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # POST /api/open_month_master/reopen  (Open Soft Close: roll back to previous month)
    def reopen
      record = OpenMonthMaster.for_user(current_user)

      # Authoritative count check: active (not soft-deleted) transactions in current open month
      month_start = Date.new(record.current_year, record.current_month, 1)
      month_end = month_start.end_of_month
      range = month_start..month_end

      active_count = 0
      active_count += current_user.payments.where(payment_date: range).count
      active_count += current_user.income_entries.where(entry_date: range).count
      active_count += current_user.transfer_masters.where(transfer_date: range).count if current_user.respond_to?(:transfer_masters)

      if active_count > 0 || record.has_data
        month_name = Date::MONTHNAMES[record.current_month]
        return render json: {
          error: "REOPEN_BLOCKED_NEW_MONTH_HAS_DATA",
          message: "You can't re-open the previous month because transactions exist in #{month_name} #{record.current_year}. Delete them first or keep this month open."
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
