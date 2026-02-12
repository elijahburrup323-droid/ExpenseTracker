require_relative "../../lib/sendgrid_web_delivery"

ActionMailer::Base.add_delivery_method :sendgrid_web, SendgridWebDelivery
