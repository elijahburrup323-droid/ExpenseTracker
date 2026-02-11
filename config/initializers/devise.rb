Devise.setup do |config|
  config.mailer_sender = "dj@accreditationnow.com"

  require "devise/orm/active_record"

  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]
  config.skip_session_storage = [:http_auth]
  config.stretches = Rails.env.test? ? 1 : 12
  config.reconfirmable = true
  config.expire_all_remember_me_on_sign_out = true
  config.password_length = 8..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/
  config.reset_password_within = 6.hours
  config.sign_out_via = :delete
  config.responder.error_status = :unprocessable_entity
  config.responder.redirect_status = :see_other

  # OmniAuth configuration
  config.omniauth :google_oauth2,
                  ENV["GOOGLE_CLIENT_ID"],
                  ENV["GOOGLE_CLIENT_SECRET"],
                  {
                    scope: "email,profile",
                    prompt: "select_account",
                    image_aspect_ratio: "square",
                    image_size: 50
                  }

  config.omniauth :apple,
                  ENV["APPLE_CLIENT_ID"],
                  "",
                  {
                    scope: "email name",
                    team_id: ENV["APPLE_TEAM_ID"],
                    key_id: ENV["APPLE_KEY_ID"],
                    pem: ENV["APPLE_PRIVATE_KEY"]
                  }

  config.omniauth :microsoft_graph,
                  ENV["MICROSOFT_CLIENT_ID"],
                  ENV["MICROSOFT_CLIENT_SECRET"],
                  {
                    scope: "openid profile email User.Read"
                  }
end
