module Api
  class AccountTypeMastersController < BaseController
    before_action :require_agent

    def index
      masters = AccountTypeMaster.ordered
      render json: masters.map { |m| serialize(m) }
    end

    def create
      master = AccountTypeMaster.new(master_params)
      master.sort_order ||= (AccountTypeMaster.maximum(:sort_order) || 0) + 1

      if master.save
        render json: serialize(master), status: :created
      else
        render json: { errors: master.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      master = AccountTypeMaster.find_by(id: params[:id])
      return render_not_found unless master

      if master.update(master_params)
        render json: serialize(master)
      else
        render json: { errors: master.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def can_delete
      master = AccountTypeMaster.find_by(id: params[:id])
      return render_not_found unless master

      if master.in_use?
        accounts = master.accounts.order(:name).limit(6).pluck(:name)
        total = master.accounts.count
        render json: {
          can_delete: false,
          reason: "IN_USE",
          account_names: accounts.first(5),
          total_count: total
        }
      else
        render json: { can_delete: true }
      end
    end

    def destroy
      master = AccountTypeMaster.find_by(id: params[:id])
      return render_not_found unless master

      if master.in_use?
        render json: { errors: ["This account type is currently in use and cannot be deleted. Set it to inactive instead."] }, status: :unprocessable_entity
        return
      end

      master.destroy!
      render json: { success: true }
    end

    private

    def require_agent
      unless current_user.budgethq_agent?
        render json: { error: "Access denied" }, status: :forbidden
      end
    end

    def master_params
      params.require(:account_type_master).permit(:display_name, :description, :is_active)
    end

    def serialize(m)
      {
        id: m.id,
        display_name: m.display_name,
        normalized_key: m.normalized_key,
        description: m.description,
        is_active: m.is_active,
        sort_order: m.sort_order
      }
    end
  end
end
