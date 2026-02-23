#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Starting Render build ==="
echo "DEPLOY_ENV=${DEPLOY_ENV:-uat}"

bundle install

echo "=== Assets precompile ==="
bundle exec rake assets:precompile
bundle exec rake assets:clean

# Pre-migration backup for production deploys
if [ "$DEPLOY_ENV" = "production" ]; then
  echo "=== Production: Creating pre-migration database backup ==="
  BACKUP_FILE="/tmp/pre_migrate_$(date +%Y%m%d_%H%M%S).sql.gz"
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
  echo "=== Backup saved: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1)) ==="
fi

echo "=== Database migrate ==="
bundle exec rake db:migrate
echo "=== Seed quotes ==="
bundle exec rails runner "load 'db/seeds/quotes_seed.rb'"
echo "=== Build complete ==="
