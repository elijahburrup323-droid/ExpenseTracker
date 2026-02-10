module RateLimitedVerification
  extend ActiveSupport::Concern

  MAX_SENDS_PER_HOUR = 3
  MAX_VERIFY_ATTEMPTS = 5
  LOCKOUT_DURATION = 30.minutes

  def can_send_code?
    reset_send_count_if_expired!
    send_count < MAX_SENDS_PER_HOUR
  end

  def can_verify?
    return false if locked_until.present? && locked_until > Time.current
    true
  end

  def record_send!
    reset_send_count_if_expired!
    update!(
      send_count: send_count + 1,
      send_count_reset_at: send_count_reset_at || 1.hour.from_now
    )
  end

  def record_failed_verification!
    attempts = verification_attempts + 1
    attrs = { verification_attempts: attempts }
    attrs[:locked_until] = LOCKOUT_DURATION.from_now if attempts >= MAX_VERIFY_ATTEMPTS
    update!(attrs)
  end

  def clear_verification_attempts!
    update!(verification_attempts: 0, locked_until: nil)
  end

  private

  def reset_send_count_if_expired!
    if send_count_reset_at.present? && send_count_reset_at <= Time.current
      self.send_count = 0
      self.send_count_reset_at = nil
      save! if persisted?
    end
  end
end
