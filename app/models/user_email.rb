class UserEmail < ApplicationRecord
  include RateLimitedVerification

  belongs_to :user

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :email, uniqueness: { scope: :user_id, case_sensitive: false }

  before_validation :downcase_email

  scope :verified, -> { where.not(verified_at: nil) }
  scope :unverified, -> { where(verified_at: nil) }

  def verified?
    verified_at.present?
  end

  def generate_verification_code!
    update!(
      verification_code: SecureRandom.random_number(10**6).to_s.rjust(6, "0"),
      verification_sent_at: Time.current,
      verified_at: nil
    )
  end

  def verify!(code)
    return { success: false, error: "Invalid code" } if verification_code != code
    return { success: false, error: "Code expired" } if verification_sent_at < 10.minutes.ago
    update!(verified_at: Time.current, verification_code: nil)
    { success: true }
  end

  private

  def downcase_email
    self.email = email&.downcase&.strip
  end
end
