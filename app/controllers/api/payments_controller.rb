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
          sync_tags!(payment)
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
          sync_tags!(@payment)
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

    # GET /api/payments/suggestions?q=...&category_id=...
    def suggestions
      q = params[:q].to_s.strip
      return render json: [] if q.length < 2

      category_id = params[:category_id].presence&.to_i
      base = current_user.payments

      # Category-scoped search first
      results = []
      if category_id
        results = description_suggestions(base.where(spending_category_id: category_id), q)
      end

      # Fallback to all payments if no category or no results
      if results.empty?
        results = description_suggestions(base, q)
      end

      render json: results.map { |r| { description: r[:description] } }
    end

    private

    def description_suggestions(scope, q)
      escaped = q.gsub('%', '\%').gsub('_', '\_')
      prefix_pattern = "#{escaped}%"

      # Group by description, count frequency, get most recent date
      # Prefix matches ranked first, then by frequency, then recency
      rows = scope
        .select(
          "description, COUNT(*) as freq, MAX(payment_date) as latest",
          scope.sanitize_sql_array(["CASE WHEN description ILIKE ? THEN 0 ELSE 1 END as rank_order", prefix_pattern])
        )
        .where("description ILIKE ?", "%#{escaped}%")
        .group("description")
        .order(Arel.sql("rank_order, freq DESC, latest DESC"))
        .limit(8)

      rows.map { |r| { description: r.description } }
    end

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

      tags_data = if lookup && lookup[:payment_tags]
                    (lookup[:payment_tags][p.id] || []).map { |t| { id: t.id, name: t.name, color_key: t.color_key } }
                  else
                    p.tags.map { |t| { id: t.id, name: t.name, color_key: t.color_key } }
                  end

      p.as_json(only: [:id, :payment_date, :description, :notes, :amount, :sort_order])
        .merge(
          account_id: p.account_id,
          spending_category_id: p.spending_category_id,
          spending_type_override_id: p.spending_type_override_id,
          account_name: acct&.name || "[Deleted]",
          spending_category_name: cat&.name || "[Deleted]",
          spending_type_name: effective_type&.name || "Unknown",
          spending_type_color_key: effective_type&.color_key || "blue",
          tags: tags_data
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

      # Eager-load tags for all payments
      payment_ids = payments.map(&:id)
      assignments = TagAssignment.where(taggable_type: "Payment", taggable_id: payment_ids).includes(:tag)
      payment_tags = {}
      assignments.each do |ta|
        next unless ta.tag && ta.tag.deleted_at.nil?
        (payment_tags[ta.taggable_id] ||= []) << ta.tag
      end

      {
        accounts: Account.unscoped.where(id: acct_ids).index_by(&:id),
        categories: categories,
        types: SpendingType.unscoped.where(id: type_ids).index_by(&:id),
        payment_tags: payment_tags
      }
    end

    def sync_tags!(payment)
      tag_ids = (params.dig(:payment, :tag_ids) || []).map(&:to_i).uniq
      valid_tag_ids = current_user.tags.where(id: tag_ids).pluck(:id)
      # Remove old assignments, add new ones
      payment.tag_assignments.destroy_all
      valid_tag_ids.each do |tid|
        payment.tag_assignments.create!(user: current_user, tag_id: tid)
      end
    end
  end
end
