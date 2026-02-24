class BackfillExistingUsersFeatureBlocks < ActiveRecord::Migration[7.1]
  def up
    now = Time.current

    feature_block_ids = FeatureBlock.pluck(:id)
    return if feature_block_ids.empty?

    User.find_each do |user|
      # Skip if already has activations (idempotent)
      next if UserFeatureActivation.where(user_id: user.id).exists?

      # Activate all feature blocks
      feature_block_ids.each do |fb_id|
        UserFeatureActivation.create!(
          user_id: user.id,
          feature_block_id: fb_id,
          activated_at: now,
          tutorial_completed_at: now
        )
      end

      # Create onboarding profile marked as complete
      UserOnboardingProfile.find_or_create_by!(user_id: user.id) do |profile|
        profile.persona = "full_manager"
        profile.wizard_completed_at = now
      end
    end
  end

  def down
    UserFeatureActivation.delete_all
    UserOnboardingProfile.delete_all
  end
end
