require "sendgrid-ruby"

class SendgridWebDelivery
  include SendGrid

  def initialize(settings = {})
    @api_key = settings[:api_key] || ENV["SENDGRID_API_KEY"] || ENV["SENDGRID_PASSWORD"]
  end

  def deliver!(mail)
    sg = SendGrid::API.new(api_key: @api_key)

    from = Email.new(email: mail.from.first)
    subject = mail.subject

    mail.to.each do |to_address|
      to = Email.new(email: to_address)
      content = if mail.html_part
                  Content.new(type: "text/html", value: mail.html_part.body.decoded)
                elsif mail.text_part
                  Content.new(type: "text/plain", value: mail.text_part.body.decoded)
                else
                  Content.new(type: "text/plain", value: mail.body.decoded)
                end

      sg_mail = Mail.new(from, subject, to, content)
      response = sg.client.mail._("send").post(request_body: sg_mail.to_json)

      unless response.status_code.to_i.between?(200, 299)
        raise "SendGrid API error #{response.status_code}: #{response.body}"
      end
    end
  end
end
