module Api
  module Admin
    class AuditLogsController < Api::BaseController
      before_action :require_admin

      def index
        logs = AuditLog.order(created_at: :desc)

        logs = logs.for_entity_type(params[:entity_type]) if params[:entity_type].present?
        logs = logs.by_action(params[:action_type]) if params[:action_type].present?
        logs = logs.for_user(params[:user_id]) if params[:user_id].present?
        if params[:entity_type].present? && params[:entity_id].present?
          logs = logs.for_entity(params[:entity_type], params[:entity_id])
        end

        page = [params.fetch(:page, 1).to_i, 1].max
        per_page = [params.fetch(:per_page, 50).to_i, 200].min
        total = logs.count
        logs = logs.offset((page - 1) * per_page).limit(per_page)

        render json: {
          audit_logs: logs.map { |log| audit_log_json(log) },
          total: total,
          page: page,
          per_page: per_page
        }
      end

      private

      def require_admin
        render json: { error: "Access denied" }, status: :forbidden unless current_user.budgethq_agent?
      end

      def audit_log_json(log)
        {
          id: log.id,
          user_id: log.user_id,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          action_type: log.action_type,
          before_json: log.before_json,
          after_json: log.after_json,
          metadata: log.metadata,
          created_at: log.created_at.iso8601
        }
      end
    end
  end
end
