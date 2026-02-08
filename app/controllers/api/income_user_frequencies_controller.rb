module Api
  class IncomeUserFrequenciesController < BaseController
    def index
      if params[:view_all] == "true"
        # Return ALL active master frequencies, with user's use_flag overlaid
        user_freq_map = current_user.income_user_frequencies.index_by(&:frequency_master_id)
        masters = IncomeFrequencyMaster.where(active: true).order(:sort_order)
        render json: masters.map { |m|
          uf = user_freq_map[m.id]
          {
            id: uf&.id,
            frequency_master_id: m.id,
            name: m.name,
            frequency_type: m.frequency_type,
            interval_days: m.interval_days,
            day_of_month: m.day_of_month,
            is_last_day: m.is_last_day,
            weekday: m.weekday,
            ordinal: m.ordinal,
            use_flag: uf&.use_flag || false,
            sort_order: m.sort_order
          }
        }
      else
        # Default: only show frequencies the user has toggled ON
        frequencies = current_user.income_user_frequencies.ordered.includes(:frequency_master)
                        .joins(:frequency_master).where(income_frequency_masters: { active: true })
                        .where(use_flag: true)
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
    end

    def update
      use_flag = params.dig(:income_user_frequency, :use_flag)

      # If id is a frequency_master_id (no user frequency record exists yet), create one
      uf = current_user.income_user_frequencies.find_by(id: params[:id])
      if uf.nil? && params[:frequency_master_id].present?
        master = IncomeFrequencyMaster.find_by(id: params[:frequency_master_id], active: true)
        return render_not_found unless master
        uf = current_user.income_user_frequencies.find_or_initialize_by(frequency_master_id: master.id)
        uf.sort_order ||= master.sort_order
      end
      return render_not_found unless uf

      if uf.new_record? ? uf.update(use_flag: use_flag) : uf.update(use_flag: use_flag)
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
