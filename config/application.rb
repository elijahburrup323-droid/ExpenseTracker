require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module ExpenseTracker
  class Application < Rails::Application
    config.load_defaults 7.1

    config.autoload_lib(ignore: %w[assets tasks])

    # Run app at subpath when RAILS_RELATIVE_URL_ROOT is set (e.g., "/expensetracker" for UAT).
    # When unset (production at mybudgethq.com), app runs at root "/".
    url_root = ENV["RAILS_RELATIVE_URL_ROOT"]
    config.relative_url_root = url_root.present? ? url_root : nil

    config.time_zone = "UTC"

    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: "spec/factories"
    end
  end
end
