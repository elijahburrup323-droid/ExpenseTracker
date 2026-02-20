class UserMailer < ApplicationMailer
  def verification_code_email(user_email)
    @user_email = user_email
    @code = user_email.verification_code
    @user = user_email.user
    mail(to: user_email.email, subject: "MyBudgetHQ — Verify your email address")
  end
end
