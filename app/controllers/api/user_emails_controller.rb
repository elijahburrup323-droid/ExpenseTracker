module Api
  class UserEmailsController < BaseController
    def index
      render json: current_user.user_emails.order(:created_at).map { |e|
        { id: e.id, email: e.email, verified: e.verified?, created_at: e.created_at }
      }
    end

    def create
      email = current_user.user_emails.build(email: params[:email]&.downcase&.strip)
      if email.save
        email.generate_verification_code!
        # In production, send the code via email. For now, just save it.
        render json: { id: email.id, email: email.email, verified: false, message: "Verification code sent to #{email.email}" }, status: :created
      else
        render json: { errors: email.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def verify
      email = current_user.user_emails.find(params[:id])
      result = email.verify!(params[:code])
      if result[:success]
        render json: { id: email.id, email: email.email, verified: true }
      else
        render json: { errors: [result[:error]] }, status: :unprocessable_entity
      end
    end

    def resend_code
      email = current_user.user_emails.find(params[:id])
      email.generate_verification_code!
      render json: { message: "Verification code resent to #{email.email}" }
    end

    def destroy
      email = current_user.user_emails.find(params[:id])
      email.destroy
      head :no_content
    end
  end
end
