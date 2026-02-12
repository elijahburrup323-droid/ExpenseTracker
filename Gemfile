source "https://rubygems.org"

ruby "~> 3.2.0"

# Rails framework
gem "rails", "~> 7.1.0"

# Database
gem "pg", "~> 1.5"

# Web server
gem "puma", ">= 5.0"

# Asset pipeline
gem "sprockets-rails"
gem "importmap-rails"
gem "turbo-rails"
gem "stimulus-rails"
gem "tailwindcss-rails"

# JSON APIs
gem "jbuilder"

# Security
gem "bcrypt", "~> 3.1.7"

# Authentication
gem "devise", "~> 4.9"
gem "omniauth", "~> 2.1"
gem "omniauth-rails_csrf_protection"
gem "omniauth-google-oauth2", "~> 1.1"
gem "omniauth-apple", "~> 1.3"
gem "omniauth-microsoft_graph", "~> 1.0"

# Email delivery (Web API — Render blocks SMTP ports)
gem "sendgrid-ruby", "~> 6.7"

# Phone authentication
gem "twilio-ruby", "~> 6.0"
gem "phonelib", "~> 0.8"

# Environment variables
gem "dotenv-rails", groups: [:development, :test]

# Windows compatibility
gem "tzinfo-data", platforms: %i[windows jruby]

# Performance
gem "bootsnap", require: false

group :development, :test do
  gem "debug", platforms: %i[mri windows]
  gem "rspec-rails", "~> 6.0"
  gem "factory_bot_rails"
  gem "faker"
end

group :development do
  gem "web-console"
  gem "error_highlight", ">= 0.4.0", platforms: [:ruby]
  gem "letter_opener"
  gem "annotate"
end

group :test do
  gem "capybara"
  gem "selenium-webdriver"
end
