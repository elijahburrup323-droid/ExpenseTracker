module Api
  class FinancingInstrumentsController < BaseController
    include FeatureGate
    before_action -> { require_feature!("financing") }
    before_action :set_instrument, only: [:show, :update, :destroy]

    def index
      instruments = current_user.financing_instruments.active.ordered
      if params[:exclude_subtype].present?
        instruments = instruments.where.not(instrument_subtype: params[:exclude_subtype])
      end
      render json: instruments.map { |i| instrument_json(i) }
    end

    def show
      render json: instrument_json(@instrument)
    end

    def create
      max_sort = current_user.financing_instruments.maximum(:sort_order) || 0
      instrument = current_user.financing_instruments.build(instrument_params)
      instrument.sort_order = max_sort + 1

      # Default current_principal to original_principal for new loans
      if instrument.current_principal.blank? || instrument.current_principal.zero?
        instrument.current_principal = instrument.original_principal
      end

      if instrument.save
        # Create initial ledger entry
        DebtTransaction.create!(
          user: current_user,
          financing_instrument: instrument,
          transaction_date: instrument.start_date,
          transaction_type: "CREATE",
          amount: instrument.original_principal,
          source_reference: "initial"
        )
        render json: instrument_json(instrument), status: :created
      else
        render_errors(instrument)
      end
    end

    def update
      if @instrument.update(instrument_params)
        render json: instrument_json(@instrument)
      else
        render_errors(@instrument)
      end
    end

    def destroy
      if @instrument.financing_payments.exists?
        return render json: {
          errors: ["Cannot delete: this instrument has recorded payments. Remove payments first."]
        }, status: :conflict
      end

      @instrument.soft_delete!
      head :no_content
    end

    private

    def set_instrument
      @instrument = current_user.financing_instruments.find_by(id: params[:id])
      render_not_found unless @instrument
    end

    def instrument_params
      params.require(:financing_instrument).permit(
        :name, :description, :instrument_type, :instrument_subtype, :debt_type,
        :original_principal, :current_principal, :interest_rate,
        :term_months, :start_date, :maturity_date, :payment_frequency,
        :monthly_payment, :lender_or_borrower, :include_in_net_worth, :notes
      )
    end

    def instrument_json(i)
      last = i.last_activity
      {
        id: i.id,
        name: i.name,
        description: i.description,
        instrument_type: i.instrument_type,
        instrument_subtype: i.instrument_subtype,
        debt_type: i.debt_type,
        original_principal: i.original_principal.to_f.round(2),
        current_principal: i.current_principal.to_f.round(2),
        ledger_balance: i.ledger_balance.to_f.round(2),
        progress_percent: i.progress_percent,
        status: i.debt_status,
        last_activity: last ? {
          date: last.transaction_date.to_s,
          type: last.transaction_type,
          amount: last.amount.to_f.round(2)
        } : nil,
        interest_rate: i.interest_rate.to_f,
        term_months: i.term_months,
        start_date: i.start_date&.to_s,
        maturity_date: i.maturity_date&.to_s,
        payment_frequency: i.payment_frequency,
        monthly_payment: i.monthly_payment&.to_f&.round(2),
        lender_or_borrower: i.lender_or_borrower,
        include_in_net_worth: i.include_in_net_worth,
        notes: i.notes,
        sort_order: i.sort_order
      }
    end
  end
end
