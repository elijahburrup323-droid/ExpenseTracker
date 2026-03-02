#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Starting Render build ==="
echo "DEPLOY_ENV=${DEPLOY_ENV:-uat}"

bundle install

echo "=== Clear template and bootsnap caches ==="
bundle exec rake tmp:clear

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
echo "=== Seed feature blocks ==="
bundle exec rails runner "load 'db/seeds/feature_blocks.rb'"

echo "=== Backfill existing users (post-seed) ==="
bundle exec rails runner "
  now = Time.current
  block_ids = FeatureBlock.pluck(:id)
  next if block_ids.empty?
  users_without_profile = User.left_joins(:onboarding_profile)
    .where(user_onboarding_profiles: { id: nil })
    .where('users.id IN (SELECT DISTINCT user_id FROM accounts)')
  count = 0
  users_without_profile.find_each do |user|
    UserOnboardingProfile.find_or_create_by!(user_id: user.id) do |p|
      p.persona = 'full_manager'
      p.wizard_completed_at = now
    end
    block_ids.each do |fb_id|
      UserFeatureActivation.find_or_create_by!(user_id: user.id, feature_block_id: fb_id) do |a|
        a.activated_at = now
        a.tutorial_completed_at = now
      end
    end
    count += 1
  end
  puts \"Backfilled #{count} existing users with all feature blocks\"
"

echo "=== Build complete ==="
