module Api
  class PaymentsController < BaseController
    before_action :set_payment, only: [:update, :destroy]

    def index
      payments = current_user.payments.ordered.includes(spending_category: :spending_type, account: {})
      render json: payments.map { |p|
        p.as_json(only: [:id, :payment_date, :description, :notes, :amount, :sort_order])
          .merge(
            account_id: p.account_id,
            spending_category_id: p.spending_category_id,
            account_name: p.account.name,
            spending_category_name: p.spending_category.name,
            spending_type_name: p.spending_category.spending_type.name,
            spending_type_color_key: p.spending_category.spending_type.color_key
          )
      }
    end

    def create
      payment = current_user.payments.build(payment_params)

      ActiveRecord::Base.transaction do
        if payment.save
          account = payment.account
          account.balance -= payment.amount
          account.save!
          sc = payment.spending_category
          render json: payment.as_json(only: [:id, :payment_date, :description, :notes, :amount, :sort_order])
            .merge(
              account_id: payment.account_id,
              spending_category_id: payment.spending_category_id,
              account_name: account.name,
              spending_category_name: sc.name,
              spending_type_name: sc.spending_type.name,
              spending_type_color_key: sc.spending_type.color_key
            ), status: :created
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
          # Revert old amount on old account
          old_account.balance += old_amount
          old_account.save!

          # Apply new amount on new account
          new_account = @payment.reload.account
          new_account.balance -= @payment.amount
          new_account.save!

          sc = @payment.spending_category
          render json: @payment.as_json(only: [:id, :payment_date, :description, :notes, :amount, :sort_order])
            .merge(
              account_id: @payment.account_id,
              spending_category_id: @payment.spending_category_id,
              account_name: new_account.name,
              spending_category_name: sc.name,
              spending_type_name: sc.spending_type.name,
              spending_type_color_key: sc.spending_type.color_key
            )
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
      params.require(:payment).permit(:account_id, :spending_category_id, :payment_date, :description, :notes, :amount)
    end
  end
end
