module Api
  class PaymentRecurringsController < BaseController
    before_action :set_recurring, only: [:update, :destroy]

    def index
      recurrings = current_user.payment_recurrings.ordered.includes(:account, :spending_category, :frequency_master)
      render json: recurrings.map { |r| recurring_json(r) }
    end

    def create
      max_sort = current_user.payment_recurrings.maximum(:sort_order) || 0
      recurring = current_user.payment_recurrings.build(recurring_params)
      recurring.sort_order = max_sort + 1

      if recurring.save
        render json: recurring_json(recurring), status: :created
      else
        render_errors(recurring)
      end
    end

    def update
      if @recurring.update(recurring_params)
        render json: recurring_json(@recurring)
      else
        render_errors(@recurring)
      end
    end

    def destroy
      @recurring.soft_delete!
      head :no_content
    end

    private

    def set_recurring
      @recurring = current_user.payment_recurrings.find_by(id: params[:id])
      render_not_found unless @recurring
    end

    def recurring_params
      params.require(:payment_recurring).permit(:name, :description, :amount, :account_id, :spending_category_id, :frequency_master_id, :next_date, :use_flag, :memo)
    end

    def recurring_json(r)
      r.as_json(only: [:id, :name, :description, :amount, :next_date, :use_flag, :memo, :sort_order])
        .merge(
          account_id: r.account_id,
          account_name: r.account&.name,
          spending_category_id: r.spending_category_id,
          category_name: r.spending_category&.name,
          frequency_master_id: r.frequency_master_id,
          frequency_name: r.frequency_master.name
        )
    end
  end
end
