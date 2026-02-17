module Api
  class BalanceAdjustmentsController < BaseController
    before_action :set_adjustment, only: [:update, :destroy]

    def create
      adjustment = current_user.balance_adjustments.build(adjustment_params)

      ActiveRecord::Base.transaction do
        if adjustment.save
          # Update account balance
          account = adjustment.account
          account.balance += adjustment.amount
          account.save!
          render json: adjustment_json(adjustment), status: :created
        else
          render_errors(adjustment)
          raise ActiveRecord::Rollback
        end
      end
    end

    def update
      ActiveRecord::Base.transaction do
        old_amount = @adjustment.amount
        account = @adjustment.account

        if @adjustment.update(adjustment_params)
          # Reverse old amount, apply new
          account.balance -= old_amount
          account.balance += @adjustment.amount
          account.save!
          render json: adjustment_json(@adjustment)
        else
          render_errors(@adjustment)
          raise ActiveRecord::Rollback
        end
      end
    end

    def destroy
      ActiveRecord::Base.transaction do
        account = @adjustment.account
        account.balance -= @adjustment.amount
        account.save!
        @adjustment.soft_delete!
      end
      head :no_content
    end

    private

    def set_adjustment
      @adjustment = current_user.balance_adjustments.find_by(id: params[:id])
      render_not_found unless @adjustment
    end

    def adjustment_params
      params.require(:balance_adjustment).permit(:account_id, :adjustment_date, :description, :amount, :notes, :reconciled)
    end

    def adjustment_json(a)
      {
        id: a.id, type: "adjustment",
        account_id: a.account_id,
        date: a.adjustment_date,
        description: a.description,
        amount: a.amount.to_f,
        notes: a.notes,
        reconciled: a.reconciled
      }
    end
  end
end
