module Api
  class FinancingPaymentsController < BaseController
    before_action :set_instrument
    before_action :set_payment, only: [:update, :destroy]

    def index
      payments = @instrument.financing_payments.by_date
      render json: payments.map { |p| payment_json(p) }
    end

    def create
      payment = PaymentAllocationService.record_payment!(
        instrument: @instrument,
        user: current_user,
        params: payment_params
      )
      render json: payment_json(payment), status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    rescue => e
      render json: { errors: [e.message] }, status: :unprocessable_entity
    end

    def update
      ActiveRecord::Base.transaction do
        # Reverse the old payment
        PaymentAllocationService.reverse_payment!(
          payment: @payment, user_id: current_user.id
        )

        # Soft-delete old payment
        @payment.soft_delete!

        # Record the updated payment
        new_payment = PaymentAllocationService.record_payment!(
          instrument: @instrument.reload,
          user: current_user,
          params: payment_params
        )

        render json: payment_json(new_payment)
      end
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    rescue => e
      render json: { errors: [e.message] }, status: :unprocessable_entity
    end

    def destroy
      ActiveRecord::Base.transaction do
        PaymentAllocationService.reverse_payment!(
          payment: @payment, user_id: current_user.id
        )
        @payment.soft_delete!
      end
      head :no_content
    end

    private

    def set_instrument
      @instrument = current_user.financing_instruments.find_by(id: params[:financing_instrument_id])
      render_not_found unless @instrument
    end

    def set_payment
      @payment = @instrument.financing_payments.find_by(id: params[:id])
      render_not_found unless @payment
    end

    def payment_params
      params.require(:financing_payment).permit(
        :payment_date, :total_amount, :interest_amount, :principal_amount,
        :extra_principal_amount, :escrow_amount, :fees_amount, :notes,
        :manual_allocation
      )
    end

    def payment_json(p)
      {
        id: p.id,
        payment_date: p.payment_date&.to_s,
        total_amount: p.total_amount.to_f.round(2),
        interest_amount: p.interest_amount.to_f.round(2),
        principal_amount: p.principal_amount.to_f.round(2),
        extra_principal_amount: p.extra_principal_amount.to_f.round(2),
        escrow_amount: p.escrow_amount.to_f.round(2),
        fees_amount: p.fees_amount.to_f.round(2),
        principal_balance_after: p.principal_balance_after.to_f.round(2),
        payment_number: p.payment_number,
        notes: p.notes
      }
    end
  end
end
