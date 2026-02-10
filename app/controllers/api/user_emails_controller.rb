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
        email.record_send!
        UserMailer.verification_code_email(email).deliver_later
        render json: { id: email.id, email: email.email, verified: false, message: "Verification code sent to #{email.email}" }, status: :created
      else
        render json: { errors: email.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def verify
      email = current_user.user_emails.find(params[:id])
      unless email.can_verify?
        return render json: { errors: ["Too many failed attempts. Try again in 30 minutes."] }, status: :too_many_requests
      end
      result = email.verify!(params[:code])
      if result[:success]
        email.clear_verification_attempts!
        render json: { id: email.id, email: email.email, verified: true }
      else
        email.record_failed_verification!
        render json: { errors: [result[:error]] }, status: :unprocessable_entity
      end
    end

    def resend_code
      email = current_user.user_emails.find(params[:id])
      unless email.can_send_code?
        return render json: { errors: ["Too many code requests. Try again later."] }, status: :too_many_requests
      end
      email.generate_verification_code!
      email.record_send!
      UserMailer.verification_code_email(email).deliver_later
      render json: { message: "Verification code resent to #{email.email}" }
    end

    def destroy
      email = current_user.user_emails.find(params[:id])
      email.destroy
      head :no_content
    end
  end
end
