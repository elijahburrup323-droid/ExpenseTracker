require "ostruct"

module TwilioService
  class << self
    def client
      @client ||= Twilio::REST::Client.new(
        ENV["TWILIO_ACCOUNT_SID"],
        ENV["TWILIO_AUTH_TOKEN"]
      )
    end

    def send_verification_code(phone_number, code)
      return mock_send(phone_number, code) if Rails.env.development? || Rails.env.test?

      client.messages.create(
        from: ENV["TWILIO_PHONE_NUMBER"],
        to: phone_number,
        body: "Your MyBudgetHQ verification code is: #{code}. Valid for 10 minutes."
      )
    end

    private

    def mock_send(phone_number, code)
      Rails.logger.info "SMS would be sent to #{phone_number}: Code #{code}"
      OpenStruct.new(sid: "mock_sid", status: "sent")
    end
  end
end
