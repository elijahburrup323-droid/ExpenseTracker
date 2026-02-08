module Api
  module Admin
    class UsersController < Api::BaseController
      before_action :require_admin

      def index
        users = User.where(deleted_at: nil).order(:last_name, :first_name)
        render json: users.map { |u| user_json(u) }
      end

      def update
        user = User.find_by(id: params[:id])
        return render_not_found unless user

        if user.update(user_params)
          render json: user_json(user)
        else
          render_errors(user)
        end
      end

      private

      def require_admin
        render json: { error: "Access denied" }, status: :forbidden unless current_user.budgethq_agent?
      end

      def user_params
        params.require(:user).permit(:budgethq_agent)
      end

      def user_json(u)
        {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          admin: u.budgethq_agent
        }
      end
    end
  end
end
