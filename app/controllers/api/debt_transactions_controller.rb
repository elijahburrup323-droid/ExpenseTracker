module Api
  class DebtTransactionsController < BaseController
    include FeatureGate
    before_action -> { require_feature!("financing") }
    before_action :set_instrument

    def index
      txns = @instrument.debt_transactions.order(transaction_date: :desc, created_at: :desc)
      render json: txns.map { |t| txn_json(t) }
    end

    def create
      allowed_types = %w[ADJUSTMENT INTEREST FEE]
      txn_type = params.dig(:debt_transaction, :transaction_type)
      unless allowed_types.include?(txn_type)
        return render json: { errors: ["Only ADJUSTMENT, INTEREST, or FEE transactions can be created manually."] }, status: :unprocessable_entity
      end

      txn = @instrument.debt_transactions.build(txn_params)
      txn.user = current_user

      if txn.save
        @instrument.sync_balance_from_ledger!
        render json: txn_json(txn), status: :created
      else
        render json: { errors: txn.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      txn = @instrument.debt_transactions.find_by(id: params[:id])
      return render_not_found unless txn

      txn.update!(deleted_at: Time.current)
      @instrument.sync_balance_from_ledger!
      head :no_content
    end

    private

    def set_instrument
      @instrument = current_user.financing_instruments.find_by(id: params[:financing_instrument_id])
      render_not_found unless @instrument
    end

    def txn_params
      params.require(:debt_transaction).permit(:transaction_date, :transaction_type, :amount, :notes, :source_reference)
    end

    def txn_json(t)
      {
        id: t.id,
        transaction_date: t.transaction_date.to_s,
        transaction_type: t.transaction_type,
        amount: t.amount.to_f.round(2),
        source_reference: t.source_reference,
        notes: t.notes,
        financing_payment_id: t.financing_payment_id,
        created_at: t.created_at.iso8601
      }
    end
  end
end
