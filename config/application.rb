require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module MyBudgetHQ
  class Application < Rails::Application
    config.load_defaults 7.1

    config.autoload_lib(ignore: %w[assets tasks middleware])

    # Redirect legacy /expensetracker URLs to /mybudgethq
    require_relative "../lib/middleware/legacy_url_redirect"
    config.middleware.insert_before 0, LegacyUrlRedirect

    # Run app at subpath when RAILS_RELATIVE_URL_ROOT is set (e.g., "/mybudgethq" for UAT).
    # When unset (production at mybudgethq.com), app runs at root "/".
    url_root = ENV["RAILS_RELATIVE_URL_ROOT"]
    config.relative_url_root = url_root.present? ? url_root : nil

    config.time_zone = "Mountain Time (US & Canada)"

    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: "spec/factories"
    end
  end
end
