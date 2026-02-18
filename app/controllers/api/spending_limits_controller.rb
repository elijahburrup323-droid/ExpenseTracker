module Api
  class SpendingLimitsController < BaseController
    # GET /api/spending_limits?scope_type=CATEGORY&yyyymm=202602
    def index
      scope_type = params[:scope_type]
      yyyymm = params[:yyyymm]&.to_i

      unless yyyymm && yyyymm > 200000
        return render json: { error: "yyyymm parameter required" }, status: :bad_request
      end

      unless [SpendingLimitHistory::SCOPE_CATEGORY, SpendingLimitHistory::SCOPE_SPENDING_TYPE].include?(scope_type)
        return render json: { error: "scope_type must be CATEGORY or SPENDING_TYPE" }, status: :bad_request
      end

      limits = SpendingLimitHistory.limits_for_month(current_user, scope_type, yyyymm)

      render json: limits.transform_values { |lh|
        {
          id: lh.id,
          scope_type: lh.scope_type,
          scope_id: lh.scope_id,
          limit_mode: lh.limit_mode,
          limit_value: lh.limit_value.to_f,
          effective_start_yyyymm: lh.effective_start_yyyymm,
          effective_end_yyyymm: lh.effective_end_yyyymm
        }
      }
    end

    # POST /api/spending_limits
    # Body: { spending_limit: { scope_type, scope_id, limit_value } }
    def create
      p = limit_params
      omm = OpenMonthMaster.for_user(current_user)
      effective_yyyymm = omm.current_year * 100 + omm.current_month

      SpendingLimitHistory.set_limit!(
        user: current_user,
        scope_type: p[:scope_type],
        scope_id: p[:scope_id].to_i,
        limit_value: p[:limit_value].to_f,
        effective_yyyymm: effective_yyyymm
      )

      render json: { success: true }, status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    # DELETE /api/spending_limits/:id
    def destroy
      limit = current_user.spending_limit_histories.find_by(id: params[:id])
      return render_not_found unless limit

      limit.soft_delete!
      head :no_content
    end

    private

    def limit_params
      params.require(:spending_limit).permit(:scope_type, :scope_id, :limit_value)
    end
  end
end
