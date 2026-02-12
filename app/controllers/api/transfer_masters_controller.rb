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
      params.require(:transfer_master).permit(:transfer_date, :from_account_id, :to_account_id, :amount, :memo)
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
          to_account_color_key: to_acct&.color_key
        )
    end
  end
end
