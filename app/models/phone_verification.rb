class PhoneVerification < ApplicationRecord
  validates :phone_number, presence: true
  validates :code, presence: true
  validates :expires_at, presence: true

  before_validation :set_defaults, on: :create

  scope :active, -> { where("expires_at > ?", Time.current) }
  scope :for_phone, ->(phone) { where(phone_number: phone) }

  def expired?
    expires_at < Time.current
  end

  def verified?
    verified_at.present?
  end

  def verify!(input_code)
    return false if expired?
    return false if verified?
    return false unless code == input_code

    update!(verified_at: Time.current)
    true
  end

  def self.generate_for(phone_number)
    normalized = Phonelib.parse(phone_number).e164
    return nil unless Phonelib.valid?(normalized)

    for_phone(normalized).where(verified_at: nil).destroy_all

    verification = create!(phone_number: normalized)
    TwilioService.send_verification_code(normalized, verification.code)
    verification
  end

  private

  def set_defaults
    self.code ||= format("%06d", SecureRandom.random_number(1_000_000))
    self.expires_at ||= 10.minutes.from_now
  end
end
