# CM-24b: Log failed login attempts
Warden::Manager.before_failure do |env, opts|
  # Only log authentication failures (not authorization failures)
  if opts[:action] == "unauthenticated" && env["REQUEST_METHOD"] == "POST"
    request = ActionDispatch::Request.new(env)
    email = request.params.dig("user", "email")
    if email.present?
      UserLoginAudit.record_failure!(email, request, reason: opts[:message]&.to_s || "invalid_credentials")
    end
  end
end
