class SeedFeatureBlocksAndBackfillUsers < ActiveRecord::Migration[7.1]
  def up
    # Phase 1: Seed feature blocks (idempotent via find_or_initialize_by)
    blocks_data = [
      { key: "core_dashboard", display_name: "Dashboard", tagline: "Your financial overview at a glance",
        description: "See your account balances, spending trends, income summary, and recent activity all in one place.",
        icon: "home", category: "Core", tier: "free", sort_order: 1, is_core: true, estimated_setup: "Already set up",
        activate_path: "/dashboard",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='dashboard-cards']", "title" => "Your Dashboard", "body" => "These cards show your key financial stats at a glance.", "position" => "bottom" },
          { "step" => 2, "selector" => "[data-tutorial='dashboard-quote']", "title" => "Daily Inspiration", "body" => "A new financial quote greets you each day.", "position" => "bottom" },
          { "step" => 3, "selector" => "[data-tutorial='dashboard-nav']", "title" => "Navigate Your Budget", "body" => "Use the sidebar to access all your budget tools.", "position" => "right" }
        ] } },
      { key: "accounts_basic", display_name: "Accounts", tagline: "Track your bank accounts and balances",
        description: "Add your checking, savings, credit cards, and other accounts. Track balances and see where your money lives.",
        icon: "credit-card", category: "Core", tier: "free", sort_order: 2, is_core: true, estimated_setup: "2 minutes",
        activate_path: "/accounts",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='accounts-table']", "title" => "Your Accounts", "body" => "This table lists all your financial accounts with their current balances.", "position" => "bottom" },
          { "step" => 2, "selector" => "[data-tutorial='accounts-add-btn']", "title" => "Add an Account", "body" => "Click here to add a new account.", "position" => "left" }
        ] } },
      { key: "payments_basic", display_name: "Payments", tagline: "Record and categorize your expenses",
        description: "Log payments, assign categories and spending types, and see where your money goes each month.",
        icon: "lock-closed", category: "Spending", tier: "free", sort_order: 3, is_core: false, estimated_setup: "3 minutes",
        activate_path: "/payments",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='payments-table']", "title" => "Your Payments", "body" => "This table shows all your payments for the current month.", "position" => "bottom" },
          { "step" => 2, "selector" => "[data-tutorial='add-payment-btn']", "title" => "Add a Payment", "body" => "Click here to record a new payment.", "position" => "left" }
        ] } },
      { key: "income_tracking", display_name: "Income", tagline: "Track money coming in",
        description: "Record income deposits from paychecks, side gigs, or other sources.",
        icon: "currency-dollar", category: "Income", tier: "free", sort_order: 4, is_core: false, estimated_setup: "2 minutes",
        activate_path: "/income_entries",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='income-table']", "title" => "Your Deposits", "body" => "This table shows all your income entries for the current month.", "position" => "bottom" },
          { "step" => 2, "selector" => "[data-tutorial='add-income-btn']", "title" => "Record Income", "body" => "Click here to add a new deposit.", "position" => "left" }
        ] } },
      { key: "recurring_income", display_name: "Recurring Deposits", tagline: "Automate your regular income",
        description: "Set up recurring income sources so deposits auto-generate on schedule.",
        icon: "arrow-path", category: "Income", tier: "free", sort_order: 5, is_core: false, estimated_setup: "3 minutes",
        activate_path: "/income_recurrings",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='recurring-income-table']", "title" => "Deposit Sources", "body" => "These are your recurring income sources.", "position" => "bottom" }
        ] } },
      { key: "recurring_payments", display_name: "Recurring Payments", tagline: "Automate your regular bills",
        description: "Set up recurring payments for rent, utilities, subscriptions, and more.",
        icon: "arrow-path", category: "Spending", tier: "free", sort_order: 6, is_core: false, estimated_setup: "3 minutes",
        activate_path: "/payment_recurrings",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='recurring-payments-table']", "title" => "Recurring Payments", "body" => "These are your recurring bills and subscriptions.", "position" => "bottom" }
        ] } },
      { key: "transfers", display_name: "Transfers", tagline: "Move money between accounts",
        description: "Record transfers between your accounts — checking to savings, credit card payments, and more.",
        icon: "arrows-right-left", category: "Accounts", tier: "free", sort_order: 7, is_core: false, estimated_setup: "1 minute",
        activate_path: "/transfer_masters",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='transfers-table']", "title" => "Your Transfers", "body" => "This table shows money you've moved between your own accounts.", "position" => "bottom" }
        ] } },
      { key: "tags", display_name: "Tags", tagline: "Organize payments with custom labels",
        description: "Create custom tags to label and filter your payments.",
        icon: "tag", category: "Spending", tier: "free", sort_order: 8, is_core: false, estimated_setup: "1 minute",
        activate_path: "/tags",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='tags-table']", "title" => "Your Tags", "body" => "Tags let you label payments with custom categories.", "position" => "bottom" }
        ] } },
      { key: "buckets", display_name: "Buckets", tagline: "Split accounts into savings goals",
        description: "Divide any account balance into named buckets — each with its own target amount and balance.",
        icon: "cube-transparent", category: "Accounts", tier: "free", sort_order: 9, is_core: false, estimated_setup: "2 minutes",
        activate_path: "/buckets",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='bucket-list']", "title" => "Your Buckets", "body" => "Each bucket represents a portion of an account's balance.", "position" => "bottom" }
        ] } },
      { key: "smart_import", display_name: "Smart Import", tagline: "Import bank statements automatically",
        description: "Upload CSV bank statements and let Smart Import classify, categorize, and create payments for you.",
        icon: "arrow-up-tray", category: "Accounts", tier: "paid", sort_order: 10, is_core: false, estimated_setup: "5 minutes",
        activate_path: "/smart_import",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='smart-import-wizard']", "title" => "Smart Import Wizard", "body" => "This step-by-step wizard guides you through importing transactions.", "position" => "bottom" }
        ] } },
      { key: "reconciliation", display_name: "Reconciliation", tagline: "Verify your account balances match the bank",
        description: "Compare your tracked balance against your bank statement to catch missed transactions.",
        icon: "check-circle", category: "Accounts", tier: "paid", sort_order: 11, is_core: false, estimated_setup: "5 minutes",
        activate_path: "/account_reconciliation",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='recon-account-select']", "title" => "Select an Account", "body" => "Choose which account you want to reconcile.", "position" => "bottom" }
        ] } },
      { key: "monthly_close", display_name: "Monthly Close", tagline: "Close out each month and lock it down",
        description: "Soft-close a month to snapshot balances and prevent accidental edits.",
        icon: "lock-closed", category: "Monthly", tier: "paid", sort_order: 12, is_core: false, estimated_setup: "1 minute",
        activate_path: "/soft_close",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='soft-close-info']", "title" => "Month Close Process", "body" => "Closing a month takes a snapshot of your balances.", "position" => "bottom" }
        ] } },
      { key: "reports", display_name: "Reports", tagline: "See trends, breakdowns, and insights",
        description: "Analyze your finances with reports: spending by category, income by source, net worth over time, and more.",
        icon: "chart-bar", category: "Monthly", tier: "paid", sort_order: 13, is_core: false, estimated_setup: "Already set up",
        activate_path: "/reports",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='reports-grid']", "title" => "Available Reports", "body" => "Browse the available reports.", "position" => "bottom" }
        ] } },
      { key: "ss_planner", display_name: "SS Benefit Planner", tagline: "Plan your Social Security retirement benefits",
        description: "Model different retirement ages and see how they affect your monthly Social Security income.",
        icon: "calculator", category: "Planning", tier: "advanced", sort_order: 14, is_core: false, estimated_setup: "5 minutes",
        activate_path: "/social_security_planner",
        tutorial_data: { "steps" => [
          { "step" => 1, "selector" => "[data-tutorial='ss-assumptions']", "title" => "Your Assumptions", "body" => "Enter your Social Security details.", "position" => "bottom" }
        ] } },
    ]

    blocks_data.each do |attrs|
      fb = FeatureBlock.find_or_initialize_by(key: attrs[:key])
      fb.assign_attributes(attrs.except(:key))
      fb.save!
    end

    say "Seeded #{FeatureBlock.count} feature blocks"

    # Phase 2: Seed dependencies
    dependencies = {
      "payments_basic" => ["accounts_basic"],
      "recurring_payments" => ["payments_basic"],
      "tags" => ["payments_basic"],
      "income_tracking" => ["accounts_basic"],
      "recurring_income" => ["income_tracking"],
      "transfers" => ["accounts_basic"],
      "buckets" => ["accounts_basic"],
      "smart_import" => ["accounts_basic"],
      "reconciliation" => ["accounts_basic"],
      "monthly_close" => ["accounts_basic"],
      "reports" => ["monthly_close"],
      "ss_planner" => ["core_dashboard"],
    }

    block_ids = FeatureBlock.pluck(:key, :id).to_h
    dependencies.each do |block_key, dep_keys|
      block_id = block_ids[block_key]
      next unless block_id
      dep_keys.each do |dep_key|
        dep_id = block_ids[dep_key]
        next unless dep_id
        FeatureBlockDependency.find_or_create_by!(feature_block_id: block_id, depends_on_id: dep_id)
      end
    end

    say "Seeded #{FeatureBlockDependency.count} dependencies"

    # Phase 3: Backfill existing users who have accounts but no onboarding profile
    now = Time.current
    all_block_ids = FeatureBlock.pluck(:id)

    users_to_backfill = User.left_joins(:onboarding_profile)
      .where(user_onboarding_profiles: { id: nil })
      .where("users.id IN (SELECT DISTINCT user_id FROM accounts)")

    count = 0
    users_to_backfill.find_each do |user|
      UserOnboardingProfile.find_or_create_by!(user_id: user.id) do |p|
        p.persona = "full_manager"
        p.wizard_completed_at = now
      end
      all_block_ids.each do |fb_id|
        UserFeatureActivation.find_or_create_by!(user_id: user.id, feature_block_id: fb_id) do |a|
          a.activated_at = now
          a.tutorial_completed_at = now
        end
      end
      count += 1
    end

    say "Backfilled #{count} existing users with all feature blocks"

    # Phase 4: Also fix users who HAVE an onboarding profile but are missing feature activations
    users_with_profile_no_activations = User.joins(:onboarding_profile)
      .where.not(id: UserFeatureActivation.select(:user_id).distinct)

    count2 = 0
    users_with_profile_no_activations.find_each do |user|
      all_block_ids.each do |fb_id|
        UserFeatureActivation.find_or_create_by!(user_id: user.id, feature_block_id: fb_id) do |a|
          a.activated_at = now
          a.tutorial_completed_at = now
        end
      end
      count2 += 1
    end

    say "Fixed #{count2} users who had onboarding profile but no feature activations"
  end

  def down
    # No-op: we don't want to remove feature blocks on rollback
  end
end
