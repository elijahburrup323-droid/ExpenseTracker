require_relative "config/environment"

map ENV.fetch("RAILS_RELATIVE_URL_ROOT", "/expensetracker") do
  run Rails.application
end
Rails.application.load_server
