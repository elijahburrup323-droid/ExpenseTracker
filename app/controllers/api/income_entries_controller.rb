module Api
  class IncomeEntriesController < BaseController
    before_action :set_entry, only: [:update, :destroy]
    before_action :generate_due_entries, only: [:index]

    def index
      entries = current_user.income_entries.ordered.includes(:account, :frequency_master, :income_recurring)
      render json: entries.map { |e| entry_json(e) }
    end

    def create
      entry = current_user.income_entries.build(entry_params)

      if entry.save
        render json: entry_json(entry), status: :created
      else
        render_errors(entry)
      end
    end

    def update
      if @entry.update(entry_params)
        render json: entry_json(@entry)
      else
        render_errors(@entry)
      end
    end

    def destroy
      @entry.soft_delete!
      head :no_content
    end

    def generate
      count = generate_due_entries
      render json: { generated: count }
    end

    private

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

    def entry_json(e)
      e.as_json(only: [:id, :source_name, :description, :entry_date, :amount, :received_flag, :sort_order])
        .merge(
          account_id: e.account_id,
          account_name: e.account&.name,
          frequency_master_id: e.frequency_master_id,
          frequency_name: e.frequency_master&.name,
          income_recurring_id: e.income_recurring_id
        )
    end
  end
end
