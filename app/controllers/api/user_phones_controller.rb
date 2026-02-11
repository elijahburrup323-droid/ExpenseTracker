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
        phone.record_send!
        begin
          TwilioService.send_verification_code(phone.phone_number, phone.verification_code)
          render json: { id: phone.id, phone_number: phone.phone_number, verified: false, message: "Verification code sent to #{phone.phone_number}" }, status: :created
        rescue => e
          Rails.logger.error "SMS SEND FAILED: #{e.class} — #{e.message}"
          render json: { id: phone.id, phone_number: phone.phone_number, verified: false, message: "Phone saved but SMS failed: #{e.message}" }, status: :created
        end
      else
        render json: { errors: phone.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def verify
      phone = current_user.user_phones.find(params[:id])
      unless phone.can_verify?
        return render json: { errors: ["Too many failed attempts. Try again in 30 minutes."] }, status: :too_many_requests
      end
      result = phone.verify!(params[:code])
      if result[:success]
        phone.clear_verification_attempts!
        render json: { id: phone.id, phone_number: phone.phone_number, verified: true }
      else
        phone.record_failed_verification!
        render json: { errors: [result[:error]] }, status: :unprocessable_entity
      end
    end

    def resend_code
      phone = current_user.user_phones.find(params[:id])
      unless phone.can_send_code?
        return render json: { errors: ["Too many code requests. Try again later."] }, status: :too_many_requests
      end
      phone.generate_verification_code!
      phone.record_send!
      begin
        TwilioService.send_verification_code(phone.phone_number, phone.verification_code)
        render json: { message: "Verification code resent to #{phone.phone_number}" }
      rescue => e
        Rails.logger.error "SMS RESEND FAILED: #{e.class} — #{e.message}"
        render json: { message: "Resend failed: #{e.message}" }, status: :unprocessable_entity
      end
    end

    def destroy
      phone = current_user.user_phones.find(params[:id])
      phone.destroy
      head :no_content
    end
  end
end
