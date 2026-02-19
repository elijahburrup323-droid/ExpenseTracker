module Api
  class ReportsMastersController < BaseController
    before_action :require_agent

    def index
      masters = ReportsMaster.ordered
      render json: masters.map { |m| serialize(m) }
    end

    def create
      master = ReportsMaster.new(master_params)
      master.sort_order_default ||= (ReportsMaster.maximum(:sort_order_default) || 0) + 1

      ActiveRecord::Base.transaction do
        if master.save
          assign_slot(master, params[:slot_number].to_i) if params[:slot_number].present?
          render json: serialize(master.reload), status: :created
        else
          render json: { errors: master.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end

    def update
      master = ReportsMaster.find_by(id: params[:id])
      return render_not_found unless master

      ActiveRecord::Base.transaction do
        if master.update(master_params)
          handle_slot_assignment(master)
          render json: serialize(master.reload)
        else
          render json: { errors: master.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end

    def can_delete
      master = ReportsMaster.find_by(id: params[:id])
      return render_not_found unless master

      in_use_count = UserReportLayout.where(report_key: master.report_key).count
      render json: { can_delete: true, in_use_count: in_use_count }
    end

    def destroy
      master = ReportsMaster.find_by(id: params[:id])
      return render_not_found unless master

      ActiveRecord::Base.transaction do
        ReportsMenuLayout.where(report_key: master.report_key).destroy_all
        master.update!(is_active: false)
      end
      render json: { success: true }
    end

    def slots
      slots_data = ReportsSlotsMaster.ordered.map do |slot|
        mapping = slot.reports_menu_layout
        {
          slot_number: slot.slot_number,
          is_active: slot.is_active,
          report_key: mapping&.report_key,
          report_title: mapping&.reports_master&.title
        }
      end
      render json: { slots: slots_data }
    end

    def add_slot
      next_num = ReportsSlotsMaster.max_slot + 1
      ReportsSlotsMaster.create!(slot_number: next_num, is_active: true, created_at: Time.current)
      render json: { slot_number: next_num }, status: :created
    end

    def route_options
      render json: ReportsMaster::REGISTERED_ROUTES
    end

    private

    def require_agent
      unless current_user.budgethq_agent?
        render json: { error: "Access denied" }, status: :forbidden
      end
    end

    def master_params
      params.require(:reports_master).permit(
        :title, :category, :description, :report_key,
        :icon_key, :accent_style, :route_path, :is_active
      )
    end

    def serialize(m)
      {
        id: m.id,
        report_key: m.report_key,
        title: m.title,
        category: m.category,
        description: m.description,
        icon_key: m.icon_key,
        accent_style: m.accent_style,
        route_path: m.route_path,
        is_active: m.is_active,
        sort_order_default: m.sort_order_default,
        assigned_slot: m.assigned_slot
      }
    end

    def handle_slot_assignment(master)
      if params.key?(:slot_number)
        ReportsMenuLayout.where(report_key: master.report_key).destroy_all
        slot_num = params[:slot_number].to_i
        assign_slot(master, slot_num) if slot_num > 0
      end
    end

    def assign_slot(master, slot_num)
      return unless slot_num > 0
      ReportsMenuLayout.where(slot_number: slot_num).destroy_all
      ReportsMenuLayout.create!(slot_number: slot_num, report_key: master.report_key)
    end
  end
end
