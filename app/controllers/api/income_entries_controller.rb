module Api
  class IncomeEntriesController < BaseController
    before_action :set_entry, only: [:update, :destroy]
    before_action :generate_due_entries, only: [:index]

    def index
      entries = current_user.income_entries.ordered.includes(:frequency_master, :income_recurring).to_a
      # Preload accounts with unscoped to show deleted account names
      acct_ids = entries.map(&:account_id).compact.uniq
      accounts_lookup = Account.unscoped.where(id: acct_ids).index_by(&:id)
      render json: entries.map { |e| entry_json(e, accounts_lookup) }
    end

    def create
      entry = current_user.income_entries.build(entry_params)

      ActiveRecord::Base.transaction do
        if entry.save
          adjust_account_balance(entry.account_id, entry.amount) if entry.received_flag && entry.account_id
          render json: entry_json(entry), status: :created
        else
          render_errors(entry)
          raise ActiveRecord::Rollback
        end
      end
    end

    def update
      old_amount = @entry.amount
      old_account_id = @entry.account_id
      old_received = @entry.received_flag

      ActiveRecord::Base.transaction do
        if @entry.update(entry_params)
          # Reverse old balance adjustment
          adjust_account_balance(old_account_id, -old_amount) if old_received && old_account_id
          # Apply new balance adjustment
          adjust_account_balance(@entry.account_id, @entry.amount) if @entry.received_flag && @entry.account_id
          render json: entry_json(@entry)
        else
          render_errors(@entry)
          raise ActiveRecord::Rollback
        end
      end
    end

    def destroy
      ActiveRecord::Base.transaction do
        adjust_account_balance(@entry.account_id, -@entry.amount) if @entry.received_flag && @entry.account_id
        @entry.soft_delete!
      end
      head :no_content
    end

    def generate
      # If no recurring sources exist, create some dummy data first
      if current_user.income_recurrings.count == 0
        seed_dummy_recurrings
      end

      count = generate_due_entries

      # If no due entries were generated, create some sample entries directly
      if count == 0
        count = create_sample_entries
      end

      render json: { generated: count }
    end

    private

    def seed_dummy_recurrings
      masters = IncomeFrequencyMaster.active.ordered
      weekly = masters.find { |m| m.name == "Bi-Weekly" } || masters.first
      monthly = masters.find { |m| m.name == "Monthly" } || masters.first
      account = current_user.accounts.first

      sources = [
        { name: "Salary", amount: 2500.00, frequency: weekly, days_ago: 0 },
        { name: "Freelance Work", amount: 800.00, frequency: monthly, days_ago: 3 },
        { name: "Rental Income", amount: 1200.00, frequency: monthly, days_ago: 7 },
      ]

      sources.each do |src|
        current_user.income_recurrings.create!(
          name: src[:name],
          amount: src[:amount],
          frequency_master: src[:frequency],
          account: account,
          next_date: Date.today - src[:days_ago],
          use_flag: true,
          sort_order: (current_user.income_recurrings.maximum(:sort_order) || 0) + 1
        )
      end
    end

    def create_sample_entries
      account = current_user.accounts.first
      frequency = IncomeFrequencyMaster.active.first

      samples = [
        { name: "Paycheck", amount: 2500.00, days_ago: 1 },
        { name: "Freelance Payment", amount: 750.00, days_ago: 5 },
        { name: "Dividend", amount: 125.50, days_ago: 10 },
        { name: "Rental Income", amount: 1200.00, days_ago: 15 },
        { name: "Side Project", amount: 300.00, days_ago: 20 },
      ]

      samples.each do |s|
        current_user.income_entries.create!(
          source_name: s[:name],
          amount: s[:amount],
          entry_date: Date.today - s[:days_ago],
          account: account,
          frequency_master: frequency,
          received_flag: false,
          sort_order: (current_user.income_entries.maximum(:sort_order) || 0) + 1
        )
      end
      samples.size
    end

    def generate_due_entries
      entries = IncomeEntry.generate_due_entries_for(current_user)
      entries.is_a?(Array) ? entries.size : 0
    end

    def set_entry
      @entry = current_user.income_entries.find_by(id: params[:id])
      render_not_found unless @entry
    end

    def entry_params
      params.require(:income_entry).permit(:source_name, :description, :entry_date, :amount, :account_id, :frequency_master_id, :income_recurring_id, :received_flag)
    end

    def adjust_account_balance(account_id, delta)
      return unless account_id
      account = current_user.accounts.find_by(id: account_id)
      return unless account
      account.update_column(:balance, account.balance + delta)
    end

    def entry_json(e, accounts_lookup = nil)
      acct = accounts_lookup ? accounts_lookup[e.account_id] : e.account
      e.as_json(only: [:id, :source_name, :description, :entry_date, :amount, :received_flag, :sort_order])
        .merge(
          account_id: e.account_id,
          account_name: acct&.name || "[Deleted]",
          frequency_master_id: e.frequency_master_id,
          frequency_name: e.frequency_master&.name,
          income_recurring_id: e.income_recurring_id
        )
    end
  end
end
