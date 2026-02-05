require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module ExpenseTracker
  class Application < Rails::Application
    config.load_defaults 7.1

    config.autoload_lib(ignore: %w[assets tasks])

    # Run app at /expensetracker subdirectory
    config.relative_url_root = "/expensetracker"

    config.time_zone = "UTC"

    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: "spec/factories"
    end
  end
end
