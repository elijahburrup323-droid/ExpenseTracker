class TestMailer < ApplicationMailer
  def test_email(to_address)
    mail(to: to_address, subject: "MyBudgetHQ Test Email — v#{APP_VERSION}", body: "If you received this, email delivery is working.")
  end

  def kanban_notify(to_address, subject, body_text)
    mail(to: to_address, subject: "MyBudgetHQ — #{subject}", body: body_text)
  end
end
