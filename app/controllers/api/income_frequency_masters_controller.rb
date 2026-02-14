module Api
  class IncomeFrequencyMastersController < BaseController
    before_action :require_agent

    def index
      masters = IncomeFrequencyMaster.ordered
      render json: masters.map { |m| serialize(m) }
    end

    def create
      master = IncomeFrequencyMaster.new(master_params)
      master.sort_order ||= (IncomeFrequencyMaster.maximum(:sort_order) || 0) + 10

      if master.save
        render json: serialize(master), status: :created
      else
        render json: { errors: master.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      master = IncomeFrequencyMaster.find_by(id: params[:id])
      return render_not_found unless master

      if master.update(master_params)
        render json: serialize(master)
      else
        render json: { errors: master.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def can_delete
      master = IncomeFrequencyMaster.find_by(id: params[:id])
      return render_not_found unless master

      if master.in_use?
        render json: { can_delete: false, reason: "IN_USE" }
      else
        render json: { can_delete: true }
      end
    end

    def destroy
      master = IncomeFrequencyMaster.find_by(id: params[:id])
      return render_not_found unless master

      if master.in_use?
        render json: { errors: ["This frequency is currently in use and can't be deleted. Remove or update the items using it, then try again."] }, status: :unprocessable_entity
        return
      end

      master.destroy!
      render json: { success: true }
    end

    private

    def require_agent
      unless current_user.budgethq_agent?
        render json: { error: "Access denied" }, status: :forbidden
      end
    end

    def master_params
      params.require(:income_frequency_master).permit(
        :name, :frequency_type, :interval_days, :day_of_month,
        :is_last_day, :weekday, :ordinal, :sort_order, :active
      )
    end

    def serialize(m)
      {
        id: m.id,
        name: m.name,
        frequency_type: m.frequency_type,
        interval_days: m.interval_days,
        day_of_month: m.day_of_month,
        is_last_day: m.is_last_day,
        weekday: m.weekday,
        ordinal: m.ordinal,
        sort_order: m.sort_order,
        active: m.active
      }
    end
  end
end
