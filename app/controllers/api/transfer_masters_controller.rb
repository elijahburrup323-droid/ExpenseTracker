module Api
  class TransferMastersController < BaseController
    before_action :set_transfer, only: [:update, :destroy]

    def index
      transfers = current_user.transfer_masters.ordered.to_a
      acct_ids = (transfers.map(&:from_account_id) + transfers.map(&:to_account_id)).compact.uniq
      accounts = Account.unscoped.where(id: acct_ids).index_by(&:id)
      render json: transfers.map { |t| transfer_json(t, accounts) }
    end

    def create
      transfer = current_user.transfer_masters.build(transfer_params)

      ActiveRecord::Base.transaction do
        if transfer.save
          from_acct = transfer.from_account
          from_acct.balance -= transfer.amount
          from_acct.save!

          to_acct = transfer.to_account
          to_acct.balance += transfer.amount
          to_acct.save!

          apply_transfer_bucket_transactions(transfer)
          flag_open_month_has_data(transfer.transfer_date, "transfer")
          render json: transfer_json(transfer), status: :created
        else
          render_errors(transfer)
          raise ActiveRecord::Rollback
        end
      end
    end

    def update
      ActiveRecord::Base.transaction do
        old_amount = @transfer.amount
        old_from = @transfer.from_account
        old_to = @transfer.to_account

        old_from_bucket_id = @transfer.from_bucket_id
        old_to_bucket_id = @transfer.to_bucket_id

        if @transfer.update(transfer_params)
          # Reverse old transfer
          old_from.balance += old_amount
          old_from.save!
          old_to.balance -= old_amount
          old_to.save!

          # Apply new transfer
          new_from = @transfer.reload.from_account
          new_from.balance -= @transfer.amount
          new_from.save!

          new_to = @transfer.reload.to_account
          new_to.balance += @transfer.amount
          new_to.save!

          # Reverse old bucket transactions and apply new ones
          reverse_transfer_bucket_transactions(old_from_bucket_id, old_to_bucket_id, old_amount, @transfer)
          apply_transfer_bucket_transactions(@transfer)

          render json: transfer_json(@transfer)
        else
          render_errors(@transfer)
          raise ActiveRecord::Rollback
        end
      end
    end

    def destroy
      ActiveRecord::Base.transaction do
        from_acct = @transfer.from_account
        from_acct.balance += @transfer.amount
        from_acct.save!

        to_acct = @transfer.to_account
        to_acct.balance -= @transfer.amount
        to_acct.save!

        reverse_transfer_bucket_transactions(@transfer.from_bucket_id, @transfer.to_bucket_id, @transfer.amount, @transfer)
        @transfer.destroy!
      end
      head :no_content
    end

    private

    def set_transfer
      @transfer = current_user.transfer_masters.find_by(id: params[:id])
      render_not_found unless @transfer
    end

    def transfer_params
      params.require(:transfer_master).permit(:transfer_date, :from_account_id, :to_account_id, :amount, :memo, :from_bucket_id, :to_bucket_id)
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

    def transfer_json(t, accounts_lookup = nil)
      if accounts_lookup
        from_acct = accounts_lookup[t.from_account_id]
        to_acct = accounts_lookup[t.to_account_id]
      else
        from_acct = Account.unscoped.find_by(id: t.from_account_id)
        to_acct = Account.unscoped.find_by(id: t.to_account_id)
      end

      t.as_json(only: [:id, :transfer_date, :amount, :memo])
        .merge(
          from_account_id: t.from_account_id,
          to_account_id: t.to_account_id,
          from_account_name: from_acct&.name || "[Deleted]",
          from_account_icon_key: from_acct&.icon_key,
          from_account_color_key: from_acct&.color_key,
          to_account_name: to_acct&.name || "[Deleted]",
          to_account_icon_key: to_acct&.icon_key,
          to_account_color_key: to_acct&.color_key,
          from_bucket_id: t.from_bucket_id,
          to_bucket_id: t.to_bucket_id,
          from_bucket_name: t.from_bucket_id.present? ? t.from_bucket&.name : nil,
          to_bucket_name: t.to_bucket_id.present? ? t.to_bucket&.name : nil
        )
    end

    def apply_transfer_bucket_transactions(transfer)
      if transfer.from_bucket_id.present?
        bucket = current_user.buckets.find(transfer.from_bucket_id)
        bucket.record_transaction!(
          direction: "OUT",
          amount: transfer.amount,
          source_type: "TRANSFER",
          source_id: transfer.id,
          memo: "Transfer out to #{transfer.to_account&.name}",
          txn_date: transfer.transfer_date
        )
      end

      if transfer.to_bucket_id.present?
        bucket = current_user.buckets.find(transfer.to_bucket_id)
        bucket.record_transaction!(
          direction: "IN",
          amount: transfer.amount,
          source_type: "TRANSFER",
          source_id: transfer.id,
          memo: "Transfer in from #{transfer.from_account&.name}",
          txn_date: transfer.transfer_date
        )
      elsif transfer.to_account&.buckets&.active&.exists?
        # If to-account has buckets but no specific bucket chosen, add to default
        default_bucket = current_user.buckets.find_by(account_id: transfer.to_account_id, is_default: true)
        if default_bucket
          default_bucket.record_transaction!(
            direction: "IN",
            amount: transfer.amount,
            source_type: "TRANSFER",
            source_id: transfer.id,
            memo: "Transfer in from #{transfer.from_account&.name} (default bucket)",
            txn_date: transfer.transfer_date
          )
        end
      end
    end

    def reverse_transfer_bucket_transactions(from_bucket_id, to_bucket_id, amount, transfer)
      if from_bucket_id.present?
        bucket = current_user.buckets.find_by(id: from_bucket_id)
        if bucket
          bucket.record_transaction!(
            direction: "IN",
            amount: amount,
            source_type: "TRANSFER",
            source_id: transfer.id,
            memo: "Reversed: transfer edit/delete",
            txn_date: transfer.transfer_date
          )
        end
      end

      if to_bucket_id.present?
        bucket = current_user.buckets.find_by(id: to_bucket_id)
        if bucket
          bucket.record_transaction!(
            direction: "OUT",
            amount: amount,
            source_type: "TRANSFER",
            source_id: transfer.id,
            memo: "Reversed: transfer edit/delete",
            txn_date: transfer.transfer_date
          )
        end
      end
    end
  end
end
