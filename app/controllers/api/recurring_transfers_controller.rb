module Api
  class RecurringTransfersController < BaseController
    before_action :set_recurring, only: [:update, :destroy]

    def index
      recurrings = current_user.recurring_transfers.ordered
                     .includes(:from_account, :to_account, :from_bucket, :to_bucket, :frequency_master)
      render json: recurrings.map { |r| recurring_json(r) }
    end

    def create
      max_sort = current_user.recurring_transfers.maximum(:sort_order) || 0
      recurring = current_user.recurring_transfers.build(recurring_params)
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
      @recurring = current_user.recurring_transfers.find_by(id: params[:id])
      render_not_found unless @recurring
    end

    def recurring_params
      params.require(:recurring_transfer).permit(
        :from_account_id, :to_account_id,
        :from_bucket_id, :to_bucket_id,
        :frequency_master_id, :amount, :next_date,
        :use_flag, :memo
      )
    end

    def recurring_json(r)
      r.as_json(only: [:id, :amount, :next_date, :use_flag, :memo, :sort_order])
        .merge(
          from_account_id: r.from_account_id,
          from_account_name: r.from_account&.name,
          to_account_id: r.to_account_id,
          to_account_name: r.to_account&.name,
          from_bucket_id: r.from_bucket_id,
          from_bucket_name: r.from_bucket&.name,
          to_bucket_id: r.to_bucket_id,
          to_bucket_name: r.to_bucket&.name,
          frequency_master_id: r.frequency_master_id,
          frequency_name: r.frequency_master&.name
        )
    end
  end
end
