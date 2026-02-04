# Puma configuration file

# Specifies the port that Puma will listen on
port ENV.fetch("PORT") { 3000 }

# Specifies the environment that Puma will run in
environment ENV.fetch("RAILS_ENV") { "development" }

# Specifies the number of workers to boot in clustered mode
workers ENV.fetch("WEB_CONCURRENCY") { 0 }

# Disable auto-restart on Windows
# plugin :tmp_restart

# Specify the directory
directory "C:/Projects/ExpenseTracker"
