module Api
  class PaymentsController < BaseController
    before_action :set_payment, only: [:update, :destroy]

    def index
      payments = current_user.payments.ordered.includes(spending_category: :spending_type, account: {}, spending_type_override: {})
      render json: payments.map { |p| payment_json(p) }
    end

    def create
      payment = current_user.payments.build(payment_params)

      ActiveRecord::Base.transaction do
        if payment.save
          account = payment.account
          account.balance -= payment.amount
          account.save!
          render json: payment_json(payment), status: :created
        else
          render_errors(payment)
          raise ActiveRecord::Rollback
        end
      end
    end

    def update
      ActiveRecord::Base.transaction do
        old_amount = @payment.amount
        old_account = @payment.account

        if @payment.update(payment_params)
          old_account.balance += old_amount
          old_account.save!

          new_account = @payment.reload.account
          new_account.balance -= @payment.amount
          new_account.save!

          render json: payment_json(@payment)
        else
          render_errors(@payment)
          raise ActiveRecord::Rollback
        end
      end
    end

    def destroy
      ActiveRecord::Base.transaction do
        account = @payment.account
        account.balance += @payment.amount
        account.save!
        @payment.soft_delete!
      end
      head :no_content
    end

    private

    def set_payment
      @payment = current_user.payments.find_by(id: params[:id])
      render_not_found unless @payment
    end

    def payment_params
      params.require(:payment).permit(:account_id, :spending_category_id, :payment_date, :description, :notes, :amount, :spending_type_override_id)
    end

    def payment_json(p)
      effective_type = p.spending_type_override || p.spending_category.spending_type
      p.as_json(only: [:id, :payment_date, :description, :notes, :amount, :sort_order])
        .merge(
          account_id: p.account_id,
          spending_category_id: p.spending_category_id,
          spending_type_override_id: p.spending_type_override_id,
          account_name: p.account.name,
          spending_category_name: p.spending_category.name,
          spending_type_name: effective_type.name,
          spending_type_color_key: effective_type.color_key
        )
    end
  end
end
