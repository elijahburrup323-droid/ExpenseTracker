#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Starting Render build ==="
bundle install
echo "=== Assets precompile ==="
bundle exec rake assets:precompile
bundle exec rake assets:clean
echo "=== Database migrate ==="
bundle exec rake db:migrate
echo "=== Seed quotes ==="
bundle exec rails runner "load 'db/seeds/quotes_seed.rb'"
echo "=== Build complete ==="
