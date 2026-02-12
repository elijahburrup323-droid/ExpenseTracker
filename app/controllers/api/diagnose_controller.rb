module Api
  class DiagnoseController < BaseController
    def test_send
      return render json: { error: "Admin only" }, status: :forbidden unless current_user.budgethq_agent?

      results = {}

      # Email config
      begin
        delivery = Rails.application.config.action_mailer.delivery_method.to_s
        results[:email] = {
          delivery_method: delivery,
          default_from: ApplicationMailer.default[:from],
          devise_from: Devise.mailer_sender,
          sendgrid_api_key: ENV["SENDGRID_PASSWORD"].present? ? "set (#{ENV['SENDGRID_PASSWORD'].length} chars, starts: #{ENV['SENDGRID_PASSWORD'][0..5]}...)" : "MISSING"
        }
        if delivery == "smtp"
          smtp = Rails.application.config.action_mailer.smtp_settings || {}
          results[:email].merge!(address: smtp[:address], port: smtp[:port])
        end
      rescue => e
        results[:email] = { config_error: "#{e.class}: #{e.message}" }
      end

      # Try sending email if email param provided
      if params[:email].present?
        begin
          if params[:notify].present? && params[:notify_body].present?
            params[:email].split(",").each do |addr|
              TestMailer.kanban_notify(addr.strip, params[:notify], params[:notify_body]).deliver_now
            end
            results[:email][:send_result] = "SUCCESS — notification sent to #{params[:email]}"
          else
            TestMailer.test_email(params[:email]).deliver_now
            results[:email][:send_result] = "SUCCESS — sent to #{params[:email]}"
          end
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
        raw = params[:phone].strip
        # Normalize to E.164: if 10 digits (US without country code), prepend +1
        digits = raw.gsub(/\D/, "")
        phone = if raw.start_with?("+")
                  raw
                elsif digits.length == 10
                  "+1#{digits}"
                elsif digits.length == 11 && digits.start_with?("1")
                  "+#{digits}"
                else
                  "+#{digits}"
                end
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
