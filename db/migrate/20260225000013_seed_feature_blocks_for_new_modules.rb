class SeedFeatureBlocksForNewModules < ActiveRecord::Migration[7.1]
  def up
    new_blocks = [
      {
        key: "assets",
        display_name: "Assets",
        tagline: "Track your physical and intangible assets",
        description: "Record vehicles, real estate, jewelry, and other assets with current values that feed into your Net Worth.",
        icon: "home-modern",
        category: "Net Worth",
        tier: "paid",
        sort_order: 15,
        is_core: false,
        estimated_setup: "3 minutes",
        activate_path: "/assets",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='assets-table']", "title" => "Your Assets", "body" => "This table lists all your tracked assets and their current values.", "position" => "bottom" },
          { "step" => 2, "selector" => "[data-tutorial='add-asset-btn']", "title" => "Add an Asset", "body" => "Click here to add a new asset like a vehicle, property, or collectible.", "position" => "left" }
        ] }
      },
      {
        key: "investments",
        display_name: "Investments",
        tagline: "Track securities with FIFO cost basis",
        description: "Add per-security holdings to your investment accounts. Track buy/sell transactions with automatic FIFO lot management and realized gain calculation.",
        icon: "chart-bar-square",
        category: "Net Worth",
        tier: "paid",
        sort_order: 16,
        is_core: false,
        estimated_setup: "5 minutes",
        activate_path: "/investments",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='holdings-table']", "title" => "Your Holdings", "body" => "This table shows your investment holdings across all accounts.", "position" => "bottom" },
          { "step" => 2, "selector" => "[data-tutorial='add-holding-btn']", "title" => "Add a Holding", "body" => "Click here to add a new security to one of your investment accounts.", "position" => "left" }
        ] }
      },
      {
        key: "financing",
        display_name: "Financing",
        tagline: "Track loans, notes, and amortization",
        description: "Record payable and receivable financing instruments. Track payment history, view amortization schedules, and see how loans affect your Net Worth.",
        icon: "banknotes",
        category: "Net Worth",
        tier: "paid",
        sort_order: 17,
        is_core: false,
        estimated_setup: "5 minutes",
        activate_path: "/financing",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='financing-table']", "title" => "Your Financing", "body" => "This table shows all your loans and financing instruments.", "position" => "bottom" },
          { "step" => 2, "selector" => "[data-tutorial='add-instrument-btn']", "title" => "Add an Instrument", "body" => "Click here to add a new loan or financing instrument.", "position" => "left" }
        ] }
      },
    ]

    # Phase 1: Seed feature blocks (idempotent via find_or_initialize_by)
    new_blocks.each do |attrs|
      fb = FeatureBlock.find_or_initialize_by(key: attrs[:key])
      fb.assign_attributes(attrs.except(:key))
      fb.save!
    end

    say "Seeded #{new_blocks.size} new feature blocks"

    # Phase 2: Seed dependencies — all three depend on accounts_basic
    dependencies = {
      "assets"      => ["accounts_basic"],
      "investments" => ["accounts_basic"],
      "financing"   => ["accounts_basic"],
    }

    block_ids = FeatureBlock.pluck(:key, :id).to_h
    dependencies.each do |block_key, dep_keys|
      block_id = block_ids[block_key]
      next unless block_id
      dep_keys.each do |dep_key|
        dep_id = block_ids[dep_key]
        next unless dep_id
        FeatureBlockDependency.find_or_create_by!(
          feature_block_id: block_id,
          depends_on_id: dep_id
        )
      end
    end

    say "Seeded dependencies for new feature blocks"

    # Phase 3: Backfill existing users — activate new blocks for all users
    # who already have onboarding complete
    now = Time.current
    new_block_ids = FeatureBlock.where(key: %w[assets investments financing]).pluck(:id)

    User.joins(:onboarding_profile)
        .where.not(user_onboarding_profiles: { wizard_completed_at: nil })
        .find_each do |user|
      new_block_ids.each do |fb_id|
        UserFeatureActivation.find_or_create_by!(
          user_id: user.id, feature_block_id: fb_id
        ) do |a|
          a.activated_at = now
          a.tutorial_completed_at = now
        end
      end
    end

    say "Backfilled existing users with new feature blocks"
  end

  def down
    # No-op: we don't remove feature blocks on rollback
  end
end
