class RestructureFeatureStore < ActiveRecord::Migration[7.1]
  def up
    # === PHASE 1: Delete features marked DLT ===
    # Remove: Recurring Deposits (recurring_income), Recurring Payments (recurring_payments),
    #         Transfers (transfers), Tags (tags)
    dlt_keys = %w[recurring_income recurring_payments transfers tags]

    dlt_ids = FeatureBlock.where(key: dlt_keys).pluck(:id)

    if dlt_ids.any?
      # Clean up all associated records
      SmartSuggestion.where(feature_block_id: dlt_ids).delete_all
      execute "DELETE FROM user_tutorial_progress WHERE feature_block_id IN (#{dlt_ids.join(',')})"
      UserFeatureActivation.where(feature_block_id: dlt_ids).delete_all
      FeatureBlockDependency.where(feature_block_id: dlt_ids).or(
        FeatureBlockDependency.where(depends_on_id: dlt_ids)
      ).delete_all
      FeatureBlock.where(id: dlt_ids).delete_all
    end

    # === PHASE 2: Move Payments, Income, Monthly Close to Core ===
    core_promotions = {
      "payments_basic"  => { is_core: true, tier: "free", sort_order: 3 },
      "income_tracking" => { is_core: true, tier: "free", sort_order: 4 },
      "monthly_close"   => { is_core: true, tier: "free", sort_order: 5 }
    }

    core_promotions.each do |key, attrs|
      block = FeatureBlock.find_by(key: key)
      next unless block
      block.update!(attrs)
    end

    # === PHASE 3: Ensure all users have activations for new core features ===
    core_block_ids = FeatureBlock.where(key: core_promotions.keys).pluck(:id)
    User.find_each do |user|
      core_block_ids.each do |block_id|
        activation = UserFeatureActivation.find_or_initialize_by(
          user_id: user.id,
          feature_block_id: block_id
        )
        activation.activated_at ||= Time.current
        activation.deactivated_at = nil
        activation.save!
      end
    end

    # === PHASE 4: Adjust sort_order for remaining add-on/premium features ===
    # Ensure Buckets stays as an add-on (not core)
    FeatureBlock.where(key: "buckets").update_all(is_core: false)

    adjustments = {
      "buckets"        => 6,
      "smart_import"   => 7,
      "reconciliation" => 8,
      "reports"        => 9,
      "assets"         => 10,
      "investments"    => 11,
      "financing"      => 12
    }

    adjustments.each do |key, order|
      FeatureBlock.where(key: key).update_all(sort_order: order)
    end

    # Reset cached keys map
    FeatureBlock.reset_keys_map! if FeatureBlock.respond_to?(:reset_keys_map!)
  end

  def down
    # Re-create deleted features (reverse of Phase 1)
    # Note: user activations and tutorial data cannot be fully restored

    payments = FeatureBlock.find_by(key: "payments_basic")
    income   = FeatureBlock.find_by(key: "income_tracking")
    accounts = FeatureBlock.find_by(key: "accounts_basic")

    recurring_payments = FeatureBlock.create!(
      key: "recurring_payments", display_name: "Recurring Payments",
      tagline: "Set up auto-repeating payments",
      description: "Define payments that repeat on a schedule — weekly, biweekly, or monthly.",
      icon: "arrow-path", category: "Spending", tier: "free", is_core: false,
      sort_order: 5, estimated_setup: "2 min"
    )

    recurring_income = FeatureBlock.create!(
      key: "recurring_income", display_name: "Recurring Deposits",
      tagline: "Automate expected income entries",
      description: "Set up recurring deposits like paychecks or regular transfers that auto-populate.",
      icon: "arrow-path", category: "Income", tier: "free", is_core: false,
      sort_order: 6, estimated_setup: "2 min"
    )

    transfers = FeatureBlock.create!(
      key: "transfers", display_name: "Transfers",
      tagline: "Move money between accounts",
      description: "Track transfers between your accounts to keep balances accurate.",
      icon: "arrows-right-left", category: "Accounts", tier: "free", is_core: false,
      sort_order: 7, estimated_setup: "1 min"
    )

    tags = FeatureBlock.create!(
      key: "tags", display_name: "Tags",
      tagline: "Categorize transactions with custom labels",
      description: "Add tags to payments and deposits for flexible categorization and filtering.",
      icon: "tag", category: "Spending", tier: "free", is_core: false,
      sort_order: 8, estimated_setup: "1 min"
    )

    # Restore dependencies
    FeatureBlockDependency.create!(feature_block: recurring_payments, depends_on: payments) if payments
    FeatureBlockDependency.create!(feature_block: tags, depends_on: payments) if payments
    FeatureBlockDependency.create!(feature_block: recurring_income, depends_on: income) if income
    FeatureBlockDependency.create!(feature_block: transfers, depends_on: accounts) if accounts

    # Revert core promotions
    revert_core = {
      "payments_basic"  => { is_core: false, tier: "free", sort_order: 3 },
      "income_tracking" => { is_core: false, tier: "free", sort_order: 4 },
      "monthly_close"   => { is_core: false, tier: "paid", sort_order: 12 }
    }

    revert_core.each do |key, attrs|
      FeatureBlock.where(key: key).update_all(attrs)
    end
  end
end
