module Api
  class BucketsController < BaseController
    before_action :set_bucket, only: [:update, :destroy, :fund]

    def index
      buckets = current_user.buckets.includes(:account).ordered
      if params[:account_id].present?
        buckets = buckets.where(account_id: params[:account_id])
      end
      acct_ids = buckets.map(&:account_id).compact.uniq
      accounts = Account.unscoped.where(id: acct_ids).index_by(&:id)
      render json: buckets.map { |b| bucket_json(b, accounts) }
    end

    def create
      bucket = current_user.buckets.build(bucket_params)

      ActiveRecord::Base.transaction do
        # Auto-assign sort_order
        max_sort = current_user.buckets.where(account_id: bucket.account_id).maximum(:sort_order) || 0
        bucket.sort_order = max_sort + 1

        # First bucket for this account becomes default
        unless current_user.buckets.where(account_id: bucket.account_id).exists?
          bucket.is_default = true
        end

        if bucket.save
          # If initial balance provided, record transaction
          if bucket.current_balance > 0
            bucket.record_transaction!(
              direction: "IN",
              amount: bucket.current_balance,
              source_type: "INITIAL",
              memo: "Initial bucket allocation",
              txn_date: Date.current
            )
          end
          render json: bucket_json(bucket), status: :created
        else
          render_errors(bucket)
          raise ActiveRecord::Rollback
        end
      end
    end

    def update
      ActiveRecord::Base.transaction do
        if @bucket.update(bucket_params)
          render json: bucket_json(@bucket)
        else
          render_errors(@bucket)
          raise ActiveRecord::Rollback
        end
      end
    end

    def destroy
      if @bucket.is_default
        return render json: { errors: ["Cannot delete the default bucket. Reassign the default first."] }, status: :unprocessable_entity
      end

      ActiveRecord::Base.transaction do
        # Transfer remaining balance to default bucket
        if @bucket.current_balance > 0
          default_bucket = current_user.buckets.find_by(account_id: @bucket.account_id, is_default: true)
          if default_bucket
            @bucket.record_transaction!(
              direction: "OUT",
              amount: @bucket.current_balance,
              source_type: "ADJUSTMENT",
              memo: "Balance transferred to default bucket on deletion",
              txn_date: Date.current
            )
            default_bucket.record_transaction!(
              direction: "IN",
              amount: @bucket.current_balance,
              source_type: "ADJUSTMENT",
              memo: "Balance received from deleted bucket '#{@bucket.name}'",
              txn_date: Date.current
            )
          end
        end

        @bucket.soft_delete!
      end
      head :no_content
    end

    # POST /api/buckets/:id/fund — move money between buckets in same account
    def fund
      from_bucket_id = params[:from_bucket_id]
      amount = params[:amount].to_f

      if amount <= 0
        return render json: { errors: ["Amount must be greater than zero."] }, status: :unprocessable_entity
      end

      from_bucket = current_user.buckets.find_by(id: from_bucket_id, account_id: @bucket.account_id)
      unless from_bucket
        return render json: { errors: ["Source bucket not found or not in the same account."] }, status: :unprocessable_entity
      end

      if from_bucket.id == @bucket.id
        return render json: { errors: ["Cannot fund a bucket from itself."] }, status: :unprocessable_entity
      end

      if from_bucket.current_balance < amount
        return render json: { errors: ["Insufficient balance in source bucket (available: $#{'%.2f' % from_bucket.current_balance})."] }, status: :unprocessable_entity
      end

      ActiveRecord::Base.transaction do
        from_bucket.record_transaction!(
          direction: "OUT",
          amount: amount,
          source_type: "FUND_MOVE",
          memo: "Moved to '#{@bucket.name}'",
          txn_date: Date.current
        )
        @bucket.record_transaction!(
          direction: "IN",
          amount: amount,
          source_type: "FUND_MOVE",
          memo: "Received from '#{from_bucket.name}'",
          txn_date: Date.current
        )
      end

      render json: {
        from_bucket: bucket_json(from_bucket.reload),
        to_bucket: bucket_json(@bucket.reload)
      }
    end

    private

    def set_bucket
      @bucket = current_user.buckets.find_by(id: params[:id])
      render_not_found unless @bucket
    end

    def bucket_params
      params.require(:bucket).permit(:account_id, :name, :is_default, :priority, :target_amount, :current_balance, :is_active, :sort_order)
    end

    def bucket_json(b, accounts_lookup = nil)
      acct = accounts_lookup ? accounts_lookup[b.account_id] : Account.unscoped.find_by(id: b.account_id)

      b.as_json(only: [:id, :name, :is_default, :priority, :target_amount, :current_balance, :is_active, :sort_order])
        .merge(
          account_id: b.account_id,
          account_name: acct&.name || "[Deleted]"
        )
    end
  end
end
