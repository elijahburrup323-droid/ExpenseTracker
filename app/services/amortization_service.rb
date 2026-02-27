class AmortizationService
  MAX_TERM_MONTHS = 480

  # Generates an amortization schedule in memory without persisting.
  # Returns an array of hashes representing each period.
  #
  # This is the preferred method for display/preview — only persist
  # entries when the user confirms or when payments are recorded.
  def self.generate_schedule(instrument)
    principal = instrument.original_principal.to_d
    rate = instrument.interest_rate.to_d
    term = instrument.term_months
    payment = instrument.monthly_payment&.to_d || calculate_payment(principal, rate, term)
    start_date = instrument.start_date
    frequency = instrument.payment_frequency

    schedule = []
    balance = principal

    (1..term).each do |period|
      break if balance <= 0

      interest = (balance * monthly_rate(rate, frequency)).round(2)
      principal_paid = [payment - interest, balance].min.round(2)
      balance = (balance - principal_paid).round(2)

      schedule << {
        period_number: period,
        due_date: advance_date(start_date, period, frequency),
        payment_amount: (principal_paid + interest).round(2),
        principal_amount: principal_paid,
        interest_amount: interest,
        extra_principal_amount: BigDecimal("0"),
        beginning_balance: (balance + principal_paid).round(2),
        ending_balance: balance
      }
    end

    schedule
  end

  # Recalculates the amortization schedule forward from a specific period.
  # Only destroys and regenerates entries from start_period onward.
  # Wraps in RecalculationSafetyService for timing/logging.
  def self.recalculate_forward!(instrument, start_period:, user_id:)
    RecalculationSafetyService.with_safety(entity: instrument, user_id: user_id) do
      # Capture before state for audit
      old_entries = instrument.amortization_schedule_entries.where("period_number >= ?", start_period)
      old_payoff_date = instrument.amortization_schedule_entries.by_period.last&.due_date
      old_interest_total = instrument.amortization_schedule_entries.sum(:interest_amount)

      # Destroy only forward entries (bounded — no full-table delete)
      old_entries.delete_all

      # Determine starting balance from the entry just before start_period
      prior_entry = instrument.amortization_schedule_entries
                              .where("period_number < ?", start_period)
                              .order(period_number: :desc)
                              .first
      balance = prior_entry&.ending_balance || instrument.original_principal.to_d

      rate = instrument.interest_rate.to_d
      payment = instrument.monthly_payment&.to_d || calculate_payment(
        instrument.original_principal.to_d, rate, instrument.term_months
      )
      frequency = instrument.payment_frequency
      start_date = instrument.start_date

      entries_to_insert = []
      (start_period..instrument.term_months).each do |period|
        break if balance <= 0

        interest = (balance * monthly_rate(rate, frequency)).round(2)
        principal_paid = [payment - interest, balance].min.round(2)
        balance = (balance - principal_paid).round(2)

        entries_to_insert << {
          user_id: user_id,
          financing_instrument_id: instrument.id,
          period_number: period,
          due_date: advance_date(start_date, period, frequency),
          payment_amount: (principal_paid + interest).round(2),
          principal_amount: principal_paid,
          interest_amount: interest,
          extra_principal_amount: 0,
          beginning_balance: (balance + principal_paid).round(2),
          ending_balance: balance,
          is_actual: false,
          created_at: Time.current,
          updated_at: Time.current
        }
      end

      # Bulk insert for performance (no per-row callbacks needed on schedule entries)
      AmortizationScheduleEntry.insert_all(entries_to_insert) if entries_to_insert.any?

      # Audit the recalculation
      new_interest_total = instrument.amortization_schedule_entries.reload.sum(:interest_amount)
      new_payoff_date = instrument.amortization_schedule_entries.by_period.last&.due_date

      FinancingInstrument.log_amortization_recalculation!(
        user_id: user_id,
        instrument: instrument,
        payment_edit_id: nil,
        recalculation_start_period: start_period,
        old_payoff_date: old_payoff_date,
        new_payoff_date: new_payoff_date,
        old_interest_total: old_interest_total.to_d,
        new_interest_total: new_interest_total.to_d
      )
    end
  end

  # --- Helpers ---

  def self.calculate_payment(principal, annual_rate, term_months)
    return (principal / term_months).round(2) if annual_rate.zero?
    r = annual_rate / 12 / 100
    (principal * r * (1 + r)**term_months / ((1 + r)**term_months - 1)).round(2)
  end

  def self.monthly_rate(annual_rate, frequency)
    case frequency
    when "MONTHLY"    then annual_rate / 12 / 100
    when "BI_WEEKLY"  then annual_rate / 26 / 100
    when "WEEKLY"     then annual_rate / 52 / 100
    else annual_rate / 12 / 100
    end
  end

  def self.advance_date(start_date, periods, frequency)
    case frequency
    when "MONTHLY"    then start_date + periods.months
    when "BI_WEEKLY"  then start_date + (periods * 2).weeks
    when "WEEKLY"     then start_date + periods.weeks
    else start_date + periods.months
    end
  end

  # All helpers are public for use by PaymentAllocationService and AmortizationSchedulesController
end
