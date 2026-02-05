require_relative "config/environment"

map Rails.application.config.relative_url_root || "/" do
  run Rails.application
end
