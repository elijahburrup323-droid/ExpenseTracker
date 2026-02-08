module Api
  class IncomeUserFrequenciesController < BaseController
    def index
      frequencies = current_user.income_user_frequencies.ordered.includes(:frequency_master)
      render json: frequencies.map { |uf|
        master = uf.frequency_master
        {
          id: uf.id,
          frequency_master_id: master.id,
          name: master.name,
          frequency_type: master.frequency_type,
          interval_days: master.interval_days,
          day_of_month: master.day_of_month,
          is_last_day: master.is_last_day,
          weekday: master.weekday,
          ordinal: master.ordinal,
          use_flag: uf.use_flag,
          sort_order: uf.sort_order
        }
      }
    end

    def update
      uf = current_user.income_user_frequencies.find_by(id: params[:id])
      return render_not_found unless uf

      if uf.update(use_flag: params.dig(:income_user_frequency, :use_flag))
        master = uf.frequency_master
        render json: {
          id: uf.id,
          frequency_master_id: master.id,
          name: master.name,
          frequency_type: master.frequency_type,
          interval_days: master.interval_days,
          day_of_month: master.day_of_month,
          is_last_day: master.is_last_day,
          weekday: master.weekday,
          ordinal: master.ordinal,
          use_flag: uf.use_flag,
          sort_order: uf.sort_order
        }
      else
        render_errors(uf)
      end
    end
  end
end
