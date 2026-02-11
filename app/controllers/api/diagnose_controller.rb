module Api
  class DiagnoseController < BaseController
    def test_send
      return render json: { error: "Admin only" }, status: :forbidden unless current_user.budgethq_agent?

      results = {}

      # Test email config
      results[:email] = {
        delivery_method: ActionMailer::Base.delivery_method.to_s,
        smtp_settings: ActionMailer::Base.smtp_settings.except(:password).merge(
          password_present: ActionMailer::Base.smtp_settings[:password].present?,
          password_starts_with: ActionMailer::Base.smtp_settings[:password].to_s[0..3]
        ),
        default_from: ApplicationMailer.default[:from],
        devise_from: Devise.mailer_sender
      }

      # Try sending a test email
      begin
        mail = UserMailer.verification_code_email(
          OpenStruct.new(email: current_user.email, verification_code: "000000", user: current_user)
        )
        mail.deliver_now
        results[:email][:send_result] = "SUCCESS"
      rescue => e
        results[:email][:send_result] = "FAILED: #{e.class} — #{e.message}"
      end

      # Test Twilio config
      results[:sms] = {
        account_sid_present: ENV["TWILIO_ACCOUNT_SID"].present?,
        account_sid_prefix: ENV["TWILIO_ACCOUNT_SID"].to_s[0..3],
        auth_token_present: ENV["TWILIO_AUTH_TOKEN"].present?,
        phone_number: ENV["TWILIO_PHONE_NUMBER"],
        env_check: {
          TWILIO_ACCOUNT_SID: ENV["TWILIO_ACCOUNT_SID"].present? ? "set (#{ENV['TWILIO_ACCOUNT_SID'].length} chars)" : "MISSING",
          TWILIO_AUTH_TOKEN: ENV["TWILIO_AUTH_TOKEN"].present? ? "set (#{ENV['TWILIO_AUTH_TOKEN'].length} chars)" : "MISSING",
          TWILIO_PHONE_NUMBER: ENV["TWILIO_PHONE_NUMBER"].present? ? ENV["TWILIO_PHONE_NUMBER"] : "MISSING"
        }
      }

      # Try sending a test SMS to the current user's phone (if any)
      test_phone = current_user.phone || current_user.user_phones.first&.phone_number
      if test_phone.present?
        begin
          sms_result = TwilioService.send_verification_code(test_phone, "000000")
          results[:sms][:send_result] = "SUCCESS — SID: #{sms_result.sid}"
        rescue => e
          results[:sms][:send_result] = "FAILED: #{e.class} — #{e.message}"
        end
        results[:sms][:test_phone] = test_phone
      else
        results[:sms][:send_result] = "SKIPPED — no phone number on account"
        results[:sms][:hint] = "Add ?phone=+1XXXXXXXXXX to test a specific number"
      end

      # Allow testing a specific phone via query param
      if params[:phone].present?
        begin
          sms_result = TwilioService.send_verification_code(params[:phone], "000000")
          results[:sms][:manual_send_result] = "SUCCESS — SID: #{sms_result.sid}"
        rescue => e
          results[:sms][:manual_send_result] = "FAILED: #{e.class} — #{e.message}"
        end
        results[:sms][:manual_phone] = params[:phone]
      end

      render json: results, status: :ok
    end
  end
end
