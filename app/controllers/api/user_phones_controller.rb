module Api
  class UserPhonesController < BaseController
    def index
      render json: current_user.user_phones.order(:created_at).map { |p|
        { id: p.id, phone_number: p.phone_number, verified: p.verified?, created_at: p.created_at }
      }
    end

    def create
      phone = current_user.user_phones.build(phone_number: params[:phone_number]&.strip)
      if phone.save
        phone.generate_verification_code!
        # In production, send SMS via TwilioService. For now, just save the code.
        render json: { id: phone.id, phone_number: phone.phone_number, verified: false, message: "Verification code sent to #{phone.phone_number}" }, status: :created
      else
        render json: { errors: phone.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def verify
      phone = current_user.user_phones.find(params[:id])
      result = phone.verify!(params[:code])
      if result[:success]
        render json: { id: phone.id, phone_number: phone.phone_number, verified: true }
      else
        render json: { errors: [result[:error]] }, status: :unprocessable_entity
      end
    end

    def resend_code
      phone = current_user.user_phones.find(params[:id])
      phone.generate_verification_code!
      render json: { message: "Verification code resent to #{phone.phone_number}" }
    end

    def destroy
      phone = current_user.user_phones.find(params[:id])
      phone.destroy
      head :no_content
    end
  end
end
