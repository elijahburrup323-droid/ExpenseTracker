module Api
  class InvestmentTransactionsController < BaseController
    before_action :set_transaction, only: [:update, :destroy]

    # GET /api/investment_transactions?investment_account_id=X
    # GET /api/investment_transactions?investment_holding_id=X
    def index
      if params[:investment_holding_id].present?
        holding = current_user.investment_holdings.find_by(id: params[:investment_holding_id])
        return render_not_found unless holding
        transactions = holding.investment_transactions.by_date
      elsif params[:investment_account_id].present?
        account = current_user.investment_accounts.active.find_by(id: params[:investment_account_id])
        return render_not_found unless account
        holding_ids = account.investment_holdings.active.pluck(:id)
        transactions = current_user.investment_transactions
                                   .where(investment_holding_id: holding_ids)
                                   .includes(:investment_holding)
                                   .by_date
      else
        return render json: { error: "investment_account_id or investment_holding_id required" }, status: :bad_request
      end

      render json: transactions.map { |t| transaction_json(t) }
    end

    # POST /api/investment_transactions
    def create
      holding = current_user.investment_holdings.find_by(id: params[:investment_holding_id])
      return render_not_found unless holding

      txn = holding.investment_transactions.build(transaction_params)
      txn.user = current_user

      # Auto-calculate total_amount for share-based types
      if InvestmentTransaction::SHARE_TYPES.include?(txn.transaction_type) && txn.shares.present? && txn.price_per_share.present?
        txn.total_amount = (txn.shares * txn.price_per_share).round(2)
      end

      txn.fees ||= 0
      txn.realized_gain ||= 0

      ActiveRecord::Base.transaction do
        txn.save!
        InvestmentTransactionProcessor.process!(txn)
      end

      render json: transaction_json(txn.reload), status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    # PUT /api/investment_transactions/:id
    def update
      holding = @transaction.investment_holding
      old_date = @transaction.transaction_date
      old_type = @transaction.transaction_type

      ActiveRecord::Base.transaction do
        # Reverse the old transaction effects first
        InvestmentTransactionProcessor.reverse!(@transaction)

        @transaction.assign_attributes(transaction_params)

        # Re-calculate total_amount for share-based types
        if InvestmentTransaction::SHARE_TYPES.include?(@transaction.transaction_type) && @transaction.shares.present? && @transaction.price_per_share.present?
          @transaction.total_amount = (@transaction.shares * @transaction.price_per_share).round(2)
        end

        @transaction.save!

        # Re-process with new values
        InvestmentTransactionProcessor.process!(@transaction)

        # Trigger FIFO recalculation for affected sells
        trigger_date = [old_date, @transaction.transaction_date].compact.min
        if %w[BUY SELL REINVEST].include?(@transaction.transaction_type) || %w[BUY SELL REINVEST].include?(old_type)
          FifoRecalculationService.recalculate_forward!(
            holding,
            trigger_transaction_id: @transaction.id,
            trigger_date: trigger_date,
            user_id: current_user.id
          )
        end
      end

      render json: transaction_json(@transaction.reload)
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    # DELETE /api/investment_transactions/:id
    def destroy
      holding = @transaction.investment_holding
      trigger_date = @transaction.transaction_date

      ActiveRecord::Base.transaction do
        InvestmentTransactionProcessor.reverse!(@transaction)
        @transaction.update!(deleted_at: Time.current)

        # Recalculate forward if the deleted transaction could affect FIFO
        if %w[BUY SELL REINVEST].include?(@transaction.transaction_type)
          FifoRecalculationService.recalculate_forward!(
            holding,
            trigger_transaction_id: @transaction.id,
            trigger_date: trigger_date,
            user_id: current_user.id
          )
        end
      end

      render json: { success: true }
    end

    private

    def set_transaction
      @transaction = current_user.investment_transactions.find_by(id: params[:id])
      render_not_found unless @transaction
    end

    def transaction_params
      params.require(:investment_transaction).permit(
        :transaction_type, :transaction_date, :shares, :price_per_share,
        :total_amount, :fees, :notes
      )
    end

    def transaction_json(t)
      {
        id: t.id,
        investment_holding_id: t.investment_holding_id,
        ticker_symbol: t.investment_holding&.ticker_symbol,
        security_name: t.investment_holding&.security_name,
        transaction_type: t.transaction_type,
        transaction_date: t.transaction_date,
        shares: t.shares&.to_f,
        price_per_share: t.price_per_share&.to_f,
        total_amount: t.total_amount.to_f,
        fees: t.fees.to_f,
        realized_gain: t.realized_gain&.to_f,
        notes: t.notes
      }
    end
  end
end
