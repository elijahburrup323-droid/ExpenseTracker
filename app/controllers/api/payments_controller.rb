module Api
  class PaymentsController < BaseController
    before_action :set_payment, only: [:update, :destroy]

    def index
      payments = current_user.payments.ordered.to_a
      lookup = preload_unscoped(payments)
      render json: payments.map { |p| payment_json(p, lookup) }
    end

    def create
      payment = current_user.payments.build(payment_params)

      ActiveRecord::Base.transaction do
        if payment.save
          account = payment.account
          account.balance -= payment.amount
          account.save!
          flag_open_month_has_data(payment.payment_date, "payment")
          render json: payment_json(payment), status: :created
        else
          render_errors(payment)
          raise ActiveRecord::Rollback
        end
      end
    end

    def update
      # Server-side month control: payment must be in current open month to edit
      open_month = OpenMonthMaster.for_user(current_user)
      if @payment.payment_date.year != open_month.current_year || @payment.payment_date.month != open_month.current_month
        return render json: { errors: ["This payment cannot be edited because it is not in the current open month."] }, status: :conflict
      end

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

    def flag_open_month_has_data(record_date, source)
      return unless record_date
      om = OpenMonthMaster.for_user(current_user)
      d = record_date.is_a?(String) ? Date.parse(record_date) : record_date
      if d.year == om.current_year && d.month == om.current_month
        om.mark_has_data!(source)
      end
    rescue => e
      Rails.logger.warn("flag_open_month_has_data error: #{e.message}")
    end

    def payment_json(p, lookup = nil)
      if lookup
        acct = lookup[:accounts][p.account_id]
        cat = lookup[:categories][p.spending_category_id]
        override_type = p.spending_type_override_id ? lookup[:types][p.spending_type_override_id] : nil
        cat_type = cat ? lookup[:types][cat.spending_type_id] : nil
      else
        acct = p.account
        cat = p.spending_category
        override_type = p.spending_type_override
        cat_type = cat&.spending_type
      end

      effective_type = override_type || cat_type

      p.as_json(only: [:id, :payment_date, :description, :notes, :amount, :sort_order])
        .merge(
          account_id: p.account_id,
          spending_category_id: p.spending_category_id,
          spending_type_override_id: p.spending_type_override_id,
          account_name: acct&.name || "[Deleted]",
          spending_category_name: cat&.name || "[Deleted]",
          spending_type_name: effective_type&.name || "Unknown",
          spending_type_color_key: effective_type&.color_key || "blue"
        )
    end

    def preload_unscoped(payments)
      acct_ids = payments.map(&:account_id).compact.uniq
      cat_ids = payments.map(&:spending_category_id).compact.uniq
      categories = SpendingCategory.unscoped.where(id: cat_ids).index_by(&:id)
      type_ids = (
        payments.map(&:spending_type_override_id).compact +
        categories.values.map(&:spending_type_id).compact
      ).uniq

      {
        accounts: Account.unscoped.where(id: acct_ids).index_by(&:id),
        categories: categories,
        types: SpendingType.unscoped.where(id: type_ids).index_by(&:id)
      }
    end
  end
end
