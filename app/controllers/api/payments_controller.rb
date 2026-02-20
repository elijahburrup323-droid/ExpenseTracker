module Api
  class PaymentsController < BaseController
    before_action :set_payment, only: [:update, :destroy]
    before_action :generate_due_payments, only: [:index]

    def index
      payments = current_user.payments.ordered.to_a
      lookup = preload_unscoped(payments)
      render json: payments.map { |p| payment_json(p, lookup) }
    end

    def create
      payment = current_user.payments.build(payment_params)

      # Validate bucket execution before save
      if payment.is_bucket_execution && payment.bucket_id.present?
        bucket = current_user.buckets.find_by(id: payment.bucket_id)
        return render json: { errors: ["Bucket not found"] }, status: :unprocessable_entity unless bucket
        if bucket.current_balance < (payment.amount || 0)
          return render json: { errors: ["Insufficient bucket balance ($#{bucket.current_balance} available)"] }, status: :unprocessable_entity
        end
      end

      ActiveRecord::Base.transaction do
        if payment.save
          sync_tags!(payment)
          learn_category_defaults!(payment)
          account = payment.account
          account.balance -= payment.amount
          account.save!
          handle_bucket_execution_create(payment) if payment.is_bucket_execution && payment.bucket_id.present?
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
        old_bucket_id = @payment.bucket_id
        old_was_bucket_execution = @payment.is_bucket_execution

        if @payment.update(payment_params)
          sync_tags!(@payment)
          learn_category_defaults!(@payment)
          old_account.balance += old_amount
          old_account.save!

          new_account = @payment.reload.account
          new_account.balance -= @payment.amount
          new_account.save!

          handle_bucket_execution_update(@payment, old_bucket_id, old_was_bucket_execution, old_amount)

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
        reverse_bucket_execution(@payment) if @payment.is_bucket_execution && @payment.bucket_id.present?
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

    def generate_due_payments
      Payment.generate_due_payments_for(current_user)
    rescue => e
      Rails.logger.warn("generate_due_payments error: #{e.message}")
    end

    def set_payment
      @payment = current_user.payments.find_by(id: params[:id])
      render_not_found unless @payment
    end

    def payment_params
      params.require(:payment).permit(:account_id, :spending_category_id, :payment_date, :description, :notes, :amount, :spending_type_override_id, :bucket_id, :is_bucket_execution)
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

      bucket_name = nil
      if p.bucket_id.present?
        bucket_name = if lookup && lookup[:buckets]
                        lookup[:buckets][p.bucket_id]&.name
                      else
                        p.bucket&.name
                      end
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
          payment_recurring_id: p.payment_recurring_id,
          bucket_id: p.bucket_id,
          is_bucket_execution: p.is_bucket_execution,
          bucket_name: bucket_name,
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

      bucket_ids = payments.map(&:bucket_id).compact.uniq

      {
        accounts: Account.unscoped.where(id: acct_ids).index_by(&:id),
        categories: categories,
        types: SpendingType.unscoped.where(id: type_ids).index_by(&:id),
        payment_tags: payment_tags,
        buckets: bucket_ids.any? ? Bucket.unscoped.where(id: bucket_ids).index_by(&:id) : {}
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

    def learn_category_defaults!(payment)
      return unless payment.spending_category_id.present?

      category = SpendingCategory.find_by(id: payment.spending_category_id, user_id: current_user.id)
      return unless category

      payment_tag_ids = payment.tag_assignments.pluck(:tag_id)
      return if payment_tag_ids.empty?

      existing_default_tag_ids = category.tag_assignments.pluck(:tag_id)
      new_tag_ids = payment_tag_ids - existing_default_tag_ids

      new_tag_ids.each do |tid|
        category.tag_assignments.create!(user: current_user, tag_id: tid)
      end
    end

    # --- Bucket Execution Helpers ---

    def handle_bucket_execution_create(payment)
      bucket = current_user.buckets.find(payment.bucket_id)

      # Auto-transfer if bucket account differs from payment account
      if bucket.account_id != payment.account_id
        create_bucket_auto_transfer(bucket, payment)
      end

      bucket.record_transaction!(
        direction: "OUT",
        amount: payment.amount,
        source_type: "PAYMENT_EXECUTION",
        source_id: payment.id,
        memo: "Payment: #{payment.description}",
        txn_date: payment.payment_date
      )
    end

    def handle_bucket_execution_update(payment, old_bucket_id, old_was_bucket_execution, old_amount)
      # Reverse old bucket execution
      if old_was_bucket_execution && old_bucket_id.present?
        old_bucket = current_user.buckets.find(old_bucket_id)
        old_bucket.record_transaction!(
          direction: "IN",
          amount: old_amount,
          source_type: "PAYMENT_EXECUTION",
          source_id: payment.id,
          memo: "Reversed: payment edit",
          txn_date: payment.payment_date
        )
        cleanup_bucket_auto_transfer(payment)
      end

      # Apply new bucket execution
      if payment.is_bucket_execution && payment.bucket_id.present?
        handle_bucket_execution_create(payment)
      end
    end

    def reverse_bucket_execution(payment)
      bucket = current_user.buckets.find(payment.bucket_id)
      bucket.record_transaction!(
        direction: "IN",
        amount: payment.amount,
        source_type: "PAYMENT_EXECUTION",
        source_id: payment.id,
        memo: "Reversed: payment deleted",
        txn_date: payment.payment_date
      )
      cleanup_bucket_auto_transfer(payment)
    end

    def create_bucket_auto_transfer(bucket, payment)
      from_account = bucket.account
      to_account = payment.account

      current_user.transfer_masters.create!(
        from_account_id: from_account.id,
        to_account_id: to_account.id,
        amount: payment.amount,
        transfer_date: payment.payment_date,
        memo: "Auto: bucket execution (payment ##{payment.id})",
        from_bucket_id: bucket.id
      )

      from_account.reload
      from_account.balance -= payment.amount
      from_account.save!
      to_account.reload
      to_account.balance += payment.amount
      to_account.save!
    end

    def cleanup_bucket_auto_transfer(payment)
      transfer = current_user.transfer_masters.find_by(
        "memo LIKE ?", "%bucket execution (payment ##{payment.id})%"
      )
      return unless transfer

      from_account = transfer.from_account
      to_account = transfer.to_account
      from_account.reload
      from_account.balance += transfer.amount
      from_account.save!
      to_account.reload
      to_account.balance -= transfer.amount
      to_account.save!

      transfer.soft_delete!
    end
  end
end
