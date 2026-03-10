class RestoreTransfersTagsCoreFeatures < ActiveRecord::Migration[7.1]
  def up
    # === Restore Transfers as a Core Feature ===
    unless FeatureBlock.exists?(key: "transfers")
      FeatureBlock.create!(
        key: "transfers",
        display_name: "Transfers",
        tagline: "Move money between accounts",
        description: "Record transfers between your accounts — checking to savings, credit card payments, and more.",
        icon: "arrows-right-left",
        category: "Core",
        tier: "free",
        sort_order: 6,
        is_core: true,
        estimated_setup: "Already set up",
        activate_path: "/transfer_masters",
        tutorial_data: {
          "steps" => [
            { "step" => 1, "selector" => "[data-tutorial='transfers-table']", "title" => "Your Transfers", "body" => "This table shows money you've moved between your own accounts — savings deposits, credit card payments, etc.", "position" => "bottom" },
            { "step" => 2, "selector" => "[data-tutorial='add-transfer-btn']", "title" => "Record a Transfer", "body" => "Click here to record a transfer. Pick the source and destination accounts, amount, and date.", "position" => "left" },
          ]
        }
      )
    end

    # === Restore Tags as a Core Feature ===
    unless FeatureBlock.exists?(key: "tags")
      FeatureBlock.create!(
        key: "tags",
        display_name: "Tags",
        tagline: "Organize payments with custom labels",
        description: "Create custom tags to label and filter your payments. Great for tracking projects, trips, or anything you want to group.",
        icon: "tag",
        category: "Core",
        tier: "free",
        sort_order: 7,
        is_core: true,
        estimated_setup: "Already set up",
        activate_path: "/tags",
        tutorial_data: {
          "steps" => [
            { "step" => 1, "selector" => "[data-tutorial='tags-table']", "title" => "Your Tags", "body" => "Tags let you label payments with custom categories like 'Vacation', 'Business', or 'Home Improvement'.", "position" => "bottom" },
            { "step" => 2, "selector" => "[data-tutorial='add-tag-btn']", "title" => "Create a Tag", "body" => "Click here to create a new tag. Once created, you can attach it to any payment for easy filtering.", "position" => "left" },
          ]
        }
      )
    end

    # === Rename Income card to Income/Deposits ===
    FeatureBlock.where(key: "income_tracking").update_all(display_name: "Income/Deposits")

    # === Ensure Monthly Close is Core ===
    FeatureBlock.where(key: "monthly_close").update_all(
      is_core: true, tier: "free", category: "Core", sort_order: 5
    )

    # === Ensure Buckets is NOT Core (stays in Add-Ons) ===
    FeatureBlock.where(key: "buckets").update_all(
      is_core: false, category: "Add-On", sort_order: 8
    )

    # === Fix sort orders for remaining features ===
    {
      "smart_import"   => 9,
      "reconciliation" => 10,
      "reports"        => 11,
      "ss_planner"     => 12
    }.each do |key, order|
      FeatureBlock.where(key: key).update_all(sort_order: order)
    end

    # === Restore dependencies for Transfers and Tags ===
    accounts = FeatureBlock.find_by(key: "accounts_basic")
    payments = FeatureBlock.find_by(key: "payments_basic")
    transfers = FeatureBlock.find_by(key: "transfers")
    tags = FeatureBlock.find_by(key: "tags")

    if transfers && accounts
      FeatureBlockDependency.find_or_create_by!(
        feature_block_id: transfers.id,
        depends_on_id: accounts.id
      )
    end

    if tags && payments
      FeatureBlockDependency.find_or_create_by!(
        feature_block_id: tags.id,
        depends_on_id: payments.id
      )
    end

    # === Activate Transfers and Tags for all existing users ===
    core_ids = FeatureBlock.where(key: %w[transfers tags]).pluck(:id)
    User.find_each do |user|
      core_ids.each do |block_id|
        activation = UserFeatureActivation.find_or_initialize_by(
          user_id: user.id,
          feature_block_id: block_id
        )
        activation.activated_at ||= Time.current
        activation.deactivated_at = nil
        activation.save!
      end
    end

    FeatureBlock.reset_keys_map! if FeatureBlock.respond_to?(:reset_keys_map!)
  end

  def down
    # Remove Transfers and Tags
    dlt_ids = FeatureBlock.where(key: %w[transfers tags]).pluck(:id)
    if dlt_ids.any?
      UserFeatureActivation.where(feature_block_id: dlt_ids).delete_all
      FeatureBlockDependency.where(feature_block_id: dlt_ids)
        .or(FeatureBlockDependency.where(depends_on_id: dlt_ids)).delete_all
      FeatureBlock.where(id: dlt_ids).delete_all
    end

    # Revert Income label
    FeatureBlock.where(key: "income_tracking").update_all(display_name: "Income / Deposits")

    # Revert Monthly Close
    FeatureBlock.where(key: "monthly_close").update_all(
      is_core: false, tier: "paid", category: "Premium", sort_order: 12
    )

    # Revert Buckets to core
    FeatureBlock.where(key: "buckets").update_all(
      is_core: true, category: "Core", sort_order: 7
    )
  end
end
