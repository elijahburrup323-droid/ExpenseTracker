# Puma configuration file

# Specifies the port that Puma will listen on
port ENV.fetch("PORT") { 3000 }

# Specifies the environment that Puma will run in
environment ENV.fetch("RAILS_ENV") { "development" }

# Specifies the number of workers to boot in clustered mode
workers ENV.fetch("WEB_CONCURRENCY") { 0 }

# Use threads for concurrency
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count

# Preload app for faster worker boot
preload_app!
