class PaymentAllocationService
  # Allocates a payment amount according to the CM-12 allocation order:
  #   1. Accrued Interest
  #   2. Scheduled Principal
  #   3. Extra Principal
  #
  # Returns a hash with computed allocation and the resulting balance.
  def self.allocate(instrument:, total_amount:, payment_date:)
    total   = total_amount.to_d
    balance = instrument.current_principal.to_d
    rate    = instrument.interest_rate.to_d
    freq    = instrument.payment_frequency

    # Calculate accrued interest for this period
    period_rate = AmortizationService.monthly_rate(rate, freq)
    interest = (balance * period_rate).round(2)

    # Scheduled principal = monthly_payment - interest (standard amortization)
    scheduled_payment = instrument.monthly_payment&.to_d || AmortizationService.calculate_payment(
      instrument.original_principal.to_d, rate, instrument.term_months
    )

    # Allocation step 1: Interest
    interest_applied = [interest, total].min.round(2)
    remaining = (total - interest_applied).round(2)

    # Allocation step 2: Scheduled Principal
    scheduled_principal = [scheduled_payment - interest, BigDecimal("0")].max.round(2)
    principal_applied = [scheduled_principal, remaining, balance].min.round(2)
    remaining = (remaining - principal_applied).round(2)

    # Allocation step 3: Extra Principal
    extra_principal = [remaining, balance - principal_applied].min.round(2)
    extra_principal = [extra_principal, BigDecimal("0")].max.round(2)

    new_balance = (balance - principal_applied - extra_principal).round(2)
    new_balance = [new_balance, BigDecimal("0")].max # No negative balances

    {
      interest_amount: interest_applied,
      principal_amount: principal_applied,
      extra_principal_amount: extra_principal,
      principal_balance_after: new_balance,
      total_allocated: interest_applied + principal_applied + extra_principal
    }
  end

  # Records a payment, updates the instrument, and triggers recalculation.
  def self.record_payment!(instrument:, user:, params:)
    total_amount = params[:total_amount].to_d
    payment_date = Date.parse(params[:payment_date].to_s)

    allocation = if params[:manual_allocation] == true || params[:manual_allocation] == "true"
      # User provided their own allocation breakdown
      {
        interest_amount: params[:interest_amount].to_d,
        principal_amount: params[:principal_amount].to_d,
        extra_principal_amount: (params[:extra_principal_amount] || 0).to_d,
        principal_balance_after: (
          instrument.current_principal.to_d -
          params[:principal_amount].to_d -
          (params[:extra_principal_amount] || 0).to_d
        ).round(2).clamp(0, Float::INFINITY)
      }
    else
      allocate(instrument: instrument, total_amount: total_amount, payment_date: payment_date)
    end

    # Determine payment number
    last_number = instrument.financing_payments.maximum(:payment_number) || 0

    payment = nil
    ActiveRecord::Base.transaction do
      Auditable.with_audit_user(user.id) do
        payment = instrument.financing_payments.create!(
          user: user,
          payment_date: payment_date,
          total_amount: total_amount,
          interest_amount: allocation[:interest_amount],
          principal_amount: allocation[:principal_amount],
          extra_principal_amount: allocation[:extra_principal_amount],
          escrow_amount: (params[:escrow_amount] || 0).to_d,
          fees_amount: (params[:fees_amount] || 0).to_d,
          principal_balance_after: allocation[:principal_balance_after],
          payment_number: last_number + 1,
          notes: params[:notes]
        )

        # Update instrument's current principal
        instrument.update!(current_principal: allocation[:principal_balance_after])

        # Create debt transaction ledger entry
        DebtTransaction.create!(
          user: user,
          financing_instrument: instrument,
          financing_payment: payment,
          transaction_date: payment_date,
          transaction_type: "PAYMENT",
          amount: -(allocation[:principal_amount] + allocation[:extra_principal_amount]),
          source_reference: "FinancingPayment##{payment.id}"
        )

        # Link to amortization schedule entry if one exists for this period
        matching_entry = instrument.amortization_schedule_entries
                                   .where(is_actual: false)
                                   .order(:period_number)
                                   .first
        if matching_entry
          matching_entry.update!(
            is_actual: true,
            financing_payment_id: payment.id,
            payment_amount: total_amount,
            principal_amount: allocation[:principal_amount],
            interest_amount: allocation[:interest_amount],
            extra_principal_amount: allocation[:extra_principal_amount],
            ending_balance: allocation[:principal_balance_after]
          )

          # Recalculate forward if payment differs from projected
          next_period = matching_entry.period_number + 1
          if next_period <= instrument.term_months
            AmortizationService.recalculate_forward!(
              instrument, start_period: next_period, user_id: user.id
            )
          end
        end
      end
    end

    payment
  end

  # Reverses a payment (for edit/delete), restoring the instrument balance.
  def self.reverse_payment!(payment:, user_id:)
    instrument = payment.financing_instrument

    ActiveRecord::Base.transaction do
      Auditable.with_audit_user(user_id) do
        # Restore principal
        restored_balance = (
          instrument.current_principal.to_d +
          payment.principal_amount.to_d +
          payment.extra_principal_amount.to_d
        ).round(2)
        instrument.update!(current_principal: restored_balance)

        # Soft-delete corresponding debt transaction
        DebtTransaction.where(financing_payment_id: payment.id)
                       .update_all(deleted_at: Time.current)

        # Unlink from amortization entry
        if payment.amortization_schedule_entry
          entry = payment.amortization_schedule_entry
          entry.update!(is_actual: false, financing_payment_id: nil)

          # Recalculate forward from this entry
          AmortizationService.recalculate_forward!(
            instrument, start_period: entry.period_number, user_id: user_id
          )
        end
      end
    end
  end
end
