module Api
  class AmortizationSchedulesController < BaseController
    include FeatureGate
    before_action -> { require_feature!("financing") }
    before_action :set_instrument

    # GET /api/financing_instruments/:financing_instrument_id/amortization_schedule
    # Returns the persisted schedule, or generates a preview if none exists.
    def show
      entries = @instrument.amortization_schedule_entries.by_period

      if entries.any?
        render json: {
          persisted: true,
          entries: entries.map { |e| entry_json(e) },
          summary: schedule_summary(entries)
        }
      else
        # Generate preview (in-memory, not persisted)
        preview = AmortizationService.generate_schedule(@instrument)
        render json: {
          persisted: false,
          entries: preview.map { |e| preview_json(e) },
          summary: preview_summary(preview)
        }
      end
    end

    # POST /api/financing_instruments/:financing_instrument_id/amortization_schedule/generate
    # Persists the amortization schedule for this instrument.
    def generate
      # Clear any existing projected entries (keep actual)
      @instrument.amortization_schedule_entries.projected.delete_all

      schedule = AmortizationService.generate_schedule(@instrument)

      # Determine which periods already have actual entries
      actual_periods = @instrument.amortization_schedule_entries.actual.pluck(:period_number).to_set

      entries_to_insert = schedule.reject { |e| actual_periods.include?(e[:period_number]) }.map do |entry|
        {
          user_id: current_user.id,
          financing_instrument_id: @instrument.id,
          period_number: entry[:period_number],
          due_date: entry[:due_date],
          payment_amount: entry[:payment_amount],
          principal_amount: entry[:principal_amount],
          interest_amount: entry[:interest_amount],
          extra_principal_amount: entry[:extra_principal_amount],
          beginning_balance: entry[:beginning_balance],
          ending_balance: entry[:ending_balance],
          is_actual: false,
          created_at: Time.current,
          updated_at: Time.current
        }
      end

      AmortizationScheduleEntry.insert_all(entries_to_insert) if entries_to_insert.any?

      entries = @instrument.amortization_schedule_entries.reload.by_period
      render json: {
        persisted: true,
        entries: entries.map { |e| entry_json(e) },
        summary: schedule_summary(entries)
      }, status: :created
    end

    # POST /api/financing_instruments/:financing_instrument_id/amortization_schedule/simulate_payoff
    # Non-destructive payoff simulation.
    def simulate_payoff
      extra_monthly = (params[:extra_monthly_payment] || 0).to_d
      lump_sum = (params[:lump_sum_amount] || 0).to_d
      lump_sum_period = (params[:lump_sum_period] || 1).to_i

      # Generate original schedule for comparison
      original = AmortizationService.generate_schedule(@instrument)
      original_payoff_date = original.last&.dig(:due_date)
      original_total_interest = original.sum { |e| e[:interest_amount].to_d }
      original_periods = original.size

      # Generate accelerated schedule
      accelerated = simulate_accelerated(
        @instrument, extra_monthly: extra_monthly,
        lump_sum: lump_sum, lump_sum_period: lump_sum_period
      )
      new_payoff_date = accelerated.last&.dig(:due_date)
      new_total_interest = accelerated.sum { |e| e[:interest_amount].to_d }
      new_periods = accelerated.size

      render json: {
        original: {
          payoff_date: original_payoff_date&.to_s,
          total_interest: original_total_interest.to_f.round(2),
          total_payments: original_periods
        },
        accelerated: {
          payoff_date: new_payoff_date&.to_s,
          total_interest: new_total_interest.to_f.round(2),
          total_payments: new_periods,
          entries: accelerated.map { |e| preview_json(e) }
        },
        savings: {
          interest_saved: (original_total_interest - new_total_interest).to_f.round(2),
          payments_saved: original_periods - new_periods,
          months_saved: original_periods - new_periods
        }
      }
    end

    # POST /api/financing_instruments/:financing_instrument_id/amortization_schedule/reconcile
    # As-of principal reconciliation.
    def reconcile
      as_of_date = Date.parse(params[:as_of_date].to_s)
      as_of_balance = params[:as_of_balance].to_d

      # Find the period closest to the as-of date
      entry = @instrument.amortization_schedule_entries
                         .where("due_date <= ?", as_of_date)
                         .order(due_date: :desc)
                         .first

      discrepancy = if entry
        as_of_balance - entry.ending_balance.to_d
      else
        as_of_balance - @instrument.original_principal.to_d
      end

      start_period = entry ? entry.period_number + 1 : 1

      ActiveRecord::Base.transaction do
        Auditable.with_audit_user(current_user.id) do
          # Update instrument's current principal to the lender-provided balance
          @instrument.update!(current_principal: as_of_balance)

          # If we have a schedule entry, adjust its ending balance
          entry&.update!(ending_balance: as_of_balance) if entry

          # Recalculate forward from the next period
          AmortizationService.recalculate_forward!(
            @instrument, start_period: start_period, user_id: current_user.id
          )
        end
      end

      entries = @instrument.amortization_schedule_entries.reload.by_period
      render json: {
        reconciled: true,
        discrepancy: discrepancy.to_f.round(2),
        as_of_period: entry&.period_number || 0,
        entries: entries.map { |e| entry_json(e) },
        summary: schedule_summary(entries)
      }
    rescue => e
      render json: { errors: [e.message] }, status: :unprocessable_entity
    end

    private

    def set_instrument
      @instrument = current_user.financing_instruments.find_by(id: params[:financing_instrument_id])
      render_not_found unless @instrument
    end

    def entry_json(e)
      {
        id: e.id,
        period_number: e.period_number,
        due_date: e.due_date&.to_s,
        beginning_balance: e.beginning_balance.to_f.round(2),
        payment_amount: e.payment_amount.to_f.round(2),
        principal_amount: e.principal_amount.to_f.round(2),
        interest_amount: e.interest_amount.to_f.round(2),
        extra_principal_amount: e.extra_principal_amount.to_f.round(2),
        ending_balance: e.ending_balance.to_f.round(2),
        is_actual: e.is_actual
      }
    end

    def preview_json(e)
      {
        period_number: e[:period_number],
        due_date: e[:due_date]&.to_s,
        beginning_balance: e[:beginning_balance].to_f.round(2),
        payment_amount: e[:payment_amount].to_f.round(2),
        principal_amount: e[:principal_amount].to_f.round(2),
        interest_amount: e[:interest_amount].to_f.round(2),
        extra_principal_amount: e[:extra_principal_amount].to_f.round(2),
        ending_balance: e[:ending_balance].to_f.round(2),
        is_actual: false
      }
    end

    def schedule_summary(entries)
      total_interest = entries.sum { |e| (e.respond_to?(:interest_amount) ? e.interest_amount : e[:interest_amount]).to_d }
      total_principal = entries.sum { |e| (e.respond_to?(:principal_amount) ? e.principal_amount : e[:principal_amount]).to_d }
      last_entry = entries.last
      payoff_date = last_entry.respond_to?(:due_date) ? last_entry.due_date : last_entry[:due_date]

      {
        total_interest: total_interest.to_f.round(2),
        total_principal: total_principal.to_f.round(2),
        total_cost: (total_interest + total_principal).to_f.round(2),
        payoff_date: payoff_date&.to_s,
        total_payments: entries.size
      }
    end

    def preview_summary(entries)
      schedule_summary(entries.map { |e| OpenStruct.new(e) })
    end

    def simulate_accelerated(instrument, extra_monthly:, lump_sum:, lump_sum_period:)
      principal = instrument.current_principal.to_d
      rate = instrument.interest_rate.to_d
      base_payment = instrument.monthly_payment&.to_d || AmortizationService.calculate_payment(
        instrument.original_principal.to_d, rate, instrument.term_months
      )
      start_date = instrument.start_date
      frequency = instrument.payment_frequency

      # Determine starting period based on actual payments made
      actual_count = instrument.amortization_schedule_entries.actual.count
      start_period = actual_count + 1

      schedule = []
      balance = principal

      (start_period..(instrument.term_months + 120)).each do |period|
        break if balance <= 0

        period_rate = AmortizationService.monthly_rate(rate, frequency)
        interest = (balance * period_rate).round(2)
        payment = base_payment + extra_monthly

        # Apply lump sum at specified period
        extra_this_period = BigDecimal("0")
        if period == lump_sum_period + actual_count
          extra_this_period = lump_sum
        end

        principal_paid = [payment - interest + extra_this_period, balance].min.round(2)
        balance = (balance - principal_paid).round(2)
        balance = [balance, BigDecimal("0")].max

        schedule << {
          period_number: period,
          due_date: AmortizationService.advance_date(start_date, period, frequency),
          payment_amount: (interest + principal_paid).round(2),
          principal_amount: principal_paid,
          interest_amount: interest,
          extra_principal_amount: [extra_monthly + extra_this_period, BigDecimal("0")].max,
          beginning_balance: (balance + principal_paid).round(2),
          ending_balance: balance
        }
      end

      schedule
    end
  end
end
