class TestMailer < ApplicationMailer
  def test_email(to_address)
    mail(to: to_address, subject: "BudgetHQ Test Email — v#{APP_VERSION}", body: "If you received this, email delivery is working.")
  end
end
