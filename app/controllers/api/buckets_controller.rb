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
      requested_balance = bucket.current_balance.to_f

      if requested_balance < 0
        return render json: { errors: ["Current balance cannot be negative"] }, status: :unprocessable_entity
      end

      account = current_user.accounts.find_by(id: bucket.account_id)
      return render json: { errors: ["Account not found"] }, status: :unprocessable_entity unless account

      is_first_bucket = !current_user.buckets.where(account_id: bucket.account_id).exists?

      ActiveRecord::Base.transaction do
        max_sort = current_user.buckets.where(account_id: bucket.account_id).maximum(:sort_order) || 0
        bucket.sort_order = max_sort + 1

        if is_first_bucket
          # First bucket: auto-capture entire account balance, mark as primary
          bucket.is_default = true
          bucket.priority = 0
          bucket.current_balance = 0

          if bucket.save
            acct_balance = account.balance.to_f
            if acct_balance > 0
              bucket.record_transaction!(
                direction: "IN",
                amount: acct_balance,
                source_type: "INITIAL",
                memo: "Auto-captured full account balance",
                txn_date: Date.current
              )
            end
            render json: bucket_json(bucket), status: :created
          else
            render_errors(bucket)
            raise ActiveRecord::Rollback
          end
        else
          # Subsequent bucket: transfer from primary bucket
          primary = current_user.buckets.find_by(account_id: bucket.account_id, is_default: true)
          unless primary
            render json: { errors: ["No primary bucket found for this account."] }, status: :unprocessable_entity
            raise ActiveRecord::Rollback
            return
          end

          allocation = requested_balance
          if allocation > primary.current_balance.to_f
            render json: { errors: ["Allocation exceeds available funds in Primary Bucket (available: $#{'%.2f' % primary.current_balance})."] }, status: :unprocessable_entity
            raise ActiveRecord::Rollback
            return
          end

          bucket.priority = [(bucket.priority || 1), 1].max if bucket.priority == 0
          bucket.current_balance = 0

          if bucket.save
            if allocation > 0
              primary.record_transaction!(
                direction: "OUT",
                amount: allocation,
                source_type: "FUND_MOVE",
                memo: "Allocation to new bucket '#{bucket.name}'",
                txn_date: Date.current
              )
              bucket.record_transaction!(
                direction: "IN",
                amount: allocation,
                source_type: "FUND_MOVE",
                memo: "Initial allocation from primary bucket",
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
    end

    def update
      ActiveRecord::Base.transaction do
        # Block account change on default buckets
        if @bucket.is_default && bucket_params[:account_id].present? &&
           bucket_params[:account_id].to_i != @bucket.account_id
          render json: { errors: ["Cannot change account for the default bucket. Reassign the default first."] }, status: :unprocessable_entity
          raise ActiveRecord::Rollback
          return
        end

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
        transfer_amount = @bucket.current_balance.to_f
        if transfer_amount > 0
          default_bucket = current_user.buckets.find_by(account_id: @bucket.account_id, is_default: true)
          if default_bucket
            @bucket.record_transaction!(
              direction: "OUT",
              amount: transfer_amount,
              source_type: "ADJUSTMENT",
              memo: "Balance transferred to default bucket on deletion",
              txn_date: Date.current
            )
            default_bucket.record_transaction!(
              direction: "IN",
              amount: transfer_amount,
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
