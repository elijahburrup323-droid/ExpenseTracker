class UserLoginAudit < ApplicationRecord
  belongs_to :user

  validates :user_email, presence: true
  validates :login_at, presence: true

  scope :recent, ->(count = 50) { order(login_at: :desc).limit(count) }
  scope :for_user, ->(user) { where(user: user) }
  scope :successful, -> { where(success: true) }
  scope :failed, -> { where(success: false) }

  # Parse user_agent string into browser/OS/device fields
  def self.parse_user_agent(ua_string)
    return {} if ua_string.blank?

    result = {}

    # Browser detection
    case ua_string
    when /Edg(?:e|A)?\/(\S+)/i
      result[:browser_name] = "Edge"
      result[:browser_version] = $1
    when /Chrome\/(\S+)/i
      result[:browser_name] = "Chrome"
      result[:browser_version] = $1
    when /Firefox\/(\S+)/i
      result[:browser_name] = "Firefox"
      result[:browser_version] = $1
    when /Safari\/(\S+)/i
      if ua_string =~ /Version\/(\S+)/
        result[:browser_name] = "Safari"
        result[:browser_version] = $1
      end
    end
    result[:browser_name] ||= "Unknown"

    # OS detection
    case ua_string
    when /Windows NT (\S+)/i
      result[:os_name] = "Windows"
      result[:os_version] = $1
    when /Mac OS X ([\d_.]+)/i
      result[:os_name] = "macOS"
      result[:os_version] = $1.tr("_", ".")
    when /iPhone OS ([\d_]+)/i
      result[:os_name] = "iOS"
      result[:os_version] = $1.tr("_", ".")
    when /Android ([\d.]+)/i
      result[:os_name] = "Android"
      result[:os_version] = $1
    when /Linux/i
      result[:os_name] = "Linux"
    end
    result[:os_name] ||= "Unknown"

    # Device type
    result[:device_type] = if ua_string =~ /Mobile|iPhone|Android.*Mobile/i
                             "mobile"
                           elsif ua_string =~ /iPad|Android(?!.*Mobile)|Tablet/i
                             "tablet"
                           else
                             "desktop"
                           end

    result
  end

  # Record a successful login
  def self.record_login!(user, request, login_method: "password")
    ua = request.user_agent
    parsed = parse_user_agent(ua)

    create!(
      user: user,
      user_email: user.email,
      role: user.budgethq_agent? ? "agent" : "customer",
      login_method: login_method,
      session_id: request.session.id.to_s.first(64),
      ip_address: request.remote_ip,
      user_agent_raw: ua&.first(500),
      browser_name: parsed[:browser_name],
      browser_version: parsed[:browser_version]&.first(20),
      os_name: parsed[:os_name],
      os_version: parsed[:os_version]&.first(20),
      device_type: parsed[:device_type],
      request_id: request.request_id,
      app_version: defined?(APP_VERSION) ? APP_VERSION : nil,
      referrer: request.referer&.first(500),
      success: true,
      login_at: Time.current
    )
  rescue => e
    Rails.logger.error("LoginAudit: Failed to record login for user #{user&.id}: #{e.message}")
    nil
  end

  # Record a failed login attempt
  def self.record_failure!(email, request, reason: "invalid_credentials")
    ua = request.user_agent
    parsed = parse_user_agent(ua)
    user = User.find_by(email: email)

    create!(
      user_id: user&.id,
      user_email: email || "unknown",
      role: user&.budgethq_agent? ? "agent" : "customer",
      login_method: "password",
      ip_address: request.remote_ip,
      user_agent_raw: ua&.first(500),
      browser_name: parsed[:browser_name],
      browser_version: parsed[:browser_version]&.first(20),
      os_name: parsed[:os_name],
      os_version: parsed[:os_version]&.first(20),
      device_type: parsed[:device_type],
      request_id: request.request_id,
      referrer: request.referer&.first(500),
      success: false,
      failure_reason: reason,
      login_at: Time.current
    )
  rescue => e
    Rails.logger.error("LoginAudit: Failed to record failure for #{email}: #{e.message}")
    nil
  end
end
