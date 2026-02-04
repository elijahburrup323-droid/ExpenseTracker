class ApplicationMailer < ActionMailer::Base
  default from: "noreply@expensetracker.com"
  layout "mailer"
end
