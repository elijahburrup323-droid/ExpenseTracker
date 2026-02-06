module Api
  class BaseController < ApplicationController
    before_action :authenticate_user!

    private

    def render_errors(record)
      render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
    end

    def render_not_found
      render json: { error: "Not found" }, status: :not_found
    end
  end
end
