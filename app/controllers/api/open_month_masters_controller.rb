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

    # POST /api/open_month_master/close  (Soft Close: snapshot + advance to next month)
    def close
      record = OpenMonthMaster.for_user(current_user)

      if record.is_closed
        return render json: { error: "Month is already closed" }, status: :unprocessable_entity
      end

      ActiveRecord::Base.transaction do
        record.generate_snapshots!

        # Compute next month
        next_month = record.current_month + 1
        next_year = record.current_year
        if next_month > 12
          next_month = 1
          next_year += 1
        end

        record.update!(
          is_closed: false,
          locked_at: Time.current,
          locked_by_user_id: current_user.id,
          current_year: next_year,
          current_month: next_month,
          has_data: false,
          first_data_at: nil,
          first_data_source: nil
        )
      end

      render json: open_month_json(record.reload)
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
