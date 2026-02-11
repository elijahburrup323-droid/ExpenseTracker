module Api
  class DiagnoseController < BaseController
    def test_send
      return render json: { error: "Admin only" }, status: :forbidden unless current_user.budgethq_agent?

      results = {}

      # Email config
      begin
        smtp = Rails.application.config.action_mailer.smtp_settings || {}
        results[:email] = {
          delivery_method: Rails.application.config.action_mailer.delivery_method.to_s,
          address: smtp[:address],
          port: smtp[:port],
          domain: smtp[:domain],
          user_name: smtp[:user_name],
          password_present: smtp[:password].present?,
          password_preview: smtp[:password].to_s[0..5] + "...",
          default_from: ApplicationMailer.default[:from],
          devise_from: Devise.mailer_sender,
          sendgrid_username_env: ENV["SENDGRID_USERNAME"].present? ? ENV["SENDGRID_USERNAME"] : "MISSING",
          sendgrid_password_env: ENV["SENDGRID_PASSWORD"].present? ? "set (#{ENV['SENDGRID_PASSWORD'].length} chars)" : "MISSING"
        }
      rescue => e
        results[:email] = { config_error: "#{e.class}: #{e.message}" }
      end

      # Try sending email if email param provided
      if params[:email].present?
        begin
          TestMailer.test_email(params[:email]).deliver_now
          results[:email][:send_result] = "SUCCESS — sent to #{params[:email]}"
        rescue => e
          results[:email][:send_result] = "FAILED: #{e.class} — #{e.message}"
        end
      else
        results[:email][:send_result] = "SKIPPED — no email param"
      end

      # Twilio config
      begin
        results[:sms] = {
          TWILIO_ACCOUNT_SID: ENV["TWILIO_ACCOUNT_SID"].present? ? "set (#{ENV['TWILIO_ACCOUNT_SID'].to_s.length} chars, starts: #{ENV['TWILIO_ACCOUNT_SID'].to_s[0..3]})" : "MISSING",
          TWILIO_AUTH_TOKEN: ENV["TWILIO_AUTH_TOKEN"].present? ? "set (#{ENV['TWILIO_AUTH_TOKEN'].to_s.length} chars)" : "MISSING",
          TWILIO_PHONE_NUMBER: ENV["TWILIO_PHONE_NUMBER"].present? ? ENV["TWILIO_PHONE_NUMBER"] : "MISSING"
        }
      rescue => e
        results[:sms] = { config_error: "#{e.class}: #{e.message}" }
      end

      # Try sending SMS if phone param provided
      if params[:phone].present?
        phone = params[:phone].strip
        phone = "+#{phone.gsub(/\D/, '')}" unless phone.start_with?("+")
        begin
          sms_result = TwilioService.send_verification_code(phone, "000000")
          results[:sms][:send_result] = "SUCCESS — SID: #{sms_result.sid}, status: #{sms_result.status}"
        rescue => e
          results[:sms][:send_result] = "FAILED: #{e.class} — #{e.message}"
        end
        results[:sms][:test_phone] = phone
      else
        results[:sms][:send_result] = "SKIPPED — no phone param"
      end

      results[:version] = APP_VERSION

      render json: results, status: :ok
    rescue => e
      render json: { fatal_error: "#{e.class}: #{e.message}", backtrace: e.backtrace&.first(5) }, status: :internal_server_error
    end
  end
end
