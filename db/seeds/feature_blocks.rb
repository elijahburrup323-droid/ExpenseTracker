# Seed Feature Blocks and Dependencies for Progressive Feature Disclosure

blocks_data = [
  {
    key: "core_dashboard", display_name: "Dashboard", tagline: "Your financial overview at a glance",
    description: "See your account balances, spending trends, income summary, and recent activity all in one place.",
    icon: "home", category: "Core", tier: "free", sort_order: 1, is_core: true, estimated_setup: "Already set up",
    activate_path: "/dashboard",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='dashboard-cards']", "title" => "Your Dashboard", "body" => "These cards show your key financial stats at a glance — balances, spending, and income for the current month.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='dashboard-quote']", "title" => "Daily Inspiration", "body" => "A new financial quote greets you each day to keep you motivated on your budget journey.", "position" => "bottom" },
        { "step" => 3, "selector" => "[data-tutorial='dashboard-nav']", "title" => "Navigate Your Budget", "body" => "Use the sidebar to access all your budget tools. New features appear here as you activate them.", "position" => "right" },
      ]
    }
  },
  {
    key: "accounts_basic", display_name: "Accounts", tagline: "Track your bank accounts and balances",
    description: "Add your checking, savings, credit cards, and other accounts. Track balances and see where your money lives.",
    icon: "credit-card", category: "Core", tier: "free", sort_order: 2, is_core: true, estimated_setup: "2 minutes",
    activate_path: "/accounts",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='accounts-table']", "title" => "Your Accounts", "body" => "This table lists all your bank accounts, credit cards, and other financial accounts with their current balances.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='accounts-add-btn']", "title" => "Add an Account", "body" => "Click here to add a new account. Enter the name, type, and starting balance.", "position" => "left" },
        { "step" => 3, "selector" => "[data-tutorial='accounts-types']", "title" => "Account Types", "body" => "Manage your account types (Checking, Savings, Credit Card, etc.) to keep things organized.", "position" => "bottom" },
      ]
    }
  },
  {
    key: "payments_basic", display_name: "Payments", tagline: "Record and categorize your expenses",
    description: "Log payments, assign categories and spending types, and see where your money goes each month.",
    icon: "lock-closed", category: "Spending", tier: "free", sort_order: 3, is_core: false, estimated_setup: "3 minutes",
    activate_path: "/payments",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='payments-table']", "title" => "Your Payments", "body" => "This table shows all your payments for the current month. Each row is a transaction you've recorded.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='add-payment-btn']", "title" => "Add a Payment", "body" => "Click here to record a new payment. You'll enter the amount, date, account, and category.", "position" => "left" },
        { "step" => 3, "selector" => "[data-tutorial='payment-filters']", "title" => "Filter Your View", "body" => "Use these filters to narrow down payments by date range, account, category, or spending type.", "position" => "bottom" },
      ]
    }
  },
  {
    key: "income_tracking", display_name: "Income", tagline: "Track money coming in",
    description: "Record income deposits from paychecks, side gigs, or other sources. See how much you earn each month.",
    icon: "currency-dollar", category: "Income", tier: "free", sort_order: 4, is_core: false, estimated_setup: "2 minutes",
    activate_path: "/income_entries",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='income-table']", "title" => "Your Deposits", "body" => "This table shows all your income entries for the current month — paychecks, transfers in, and other deposits.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='add-income-btn']", "title" => "Record Income", "body" => "Click here to add a new deposit. Enter the amount, date, source, and which account received it.", "position" => "left" },
      ]
    }
  },
  {
    key: "recurring_income", display_name: "Recurring Deposits", tagline: "Automate your regular income",
    description: "Set up recurring income sources so deposits auto-generate on schedule. Never miss tracking a paycheck.",
    icon: "arrow-path", category: "Income", tier: "free", sort_order: 5, is_core: false, estimated_setup: "3 minutes",
    activate_path: "/income_recurrings",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='recurring-income-table']", "title" => "Deposit Sources", "body" => "These are your recurring income sources. They automatically create deposit entries on their schedule.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='add-recurring-income-btn']", "title" => "Add a Source", "body" => "Set up a new recurring deposit — like a paycheck, pension, or regular transfer. Choose the frequency and amount.", "position" => "left" },
      ]
    }
  },
  {
    key: "recurring_payments", display_name: "Recurring Payments", tagline: "Automate your regular bills",
    description: "Set up recurring payments for rent, utilities, subscriptions, and more. Bills auto-generate when due.",
    icon: "arrow-path", category: "Spending", tier: "free", sort_order: 6, is_core: false, estimated_setup: "3 minutes",
    activate_path: "/payment_recurrings",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='recurring-payments-table']", "title" => "Recurring Payments", "body" => "These are your recurring bills and subscriptions. They automatically create payment entries when due.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='add-recurring-payment-btn']", "title" => "Add a Recurring Bill", "body" => "Set up a new recurring payment — like rent, utilities, or subscriptions. Choose how often and how much.", "position" => "left" },
      ]
    }
  },
  {
    key: "transfers", display_name: "Transfers", tagline: "Move money between accounts",
    description: "Record transfers between your accounts — checking to savings, credit card payments, and more.",
    icon: "arrows-right-left", category: "Accounts", tier: "free", sort_order: 7, is_core: false, estimated_setup: "1 minute",
    activate_path: "/transfer_masters",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='transfers-table']", "title" => "Your Transfers", "body" => "This table shows money you've moved between your own accounts — savings deposits, credit card payments, etc.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='add-transfer-btn']", "title" => "Record a Transfer", "body" => "Click here to record a transfer. Pick the source and destination accounts, amount, and date.", "position" => "left" },
      ]
    }
  },
  {
    key: "tags", display_name: "Tags", tagline: "Organize payments with custom labels",
    description: "Create custom tags to label and filter your payments. Great for tracking projects, trips, or anything you want to group.",
    icon: "tag", category: "Spending", tier: "free", sort_order: 8, is_core: false, estimated_setup: "1 minute",
    activate_path: "/tags",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='tags-table']", "title" => "Your Tags", "body" => "Tags let you label payments with custom categories like 'Vacation', 'Business', or 'Home Improvement'.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='add-tag-btn']", "title" => "Create a Tag", "body" => "Click here to create a new tag. Once created, you can attach it to any payment for easy filtering.", "position" => "left" },
      ]
    }
  },
  {
    key: "buckets", display_name: "Buckets", tagline: "Split accounts into savings goals",
    description: "Divide any account balance into named buckets — each with its own target amount and balance. Perfect for saving toward multiple goals in one account.",
    icon: "cube-transparent", category: "Accounts", tier: "free", sort_order: 9, is_core: false, estimated_setup: "2 minutes",
    activate_path: "/buckets",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='bucket-list']", "title" => "Your Buckets", "body" => "This is where all your buckets appear. Each bucket represents a portion of an account's balance dedicated to a specific purpose.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='add-bucket-btn']", "title" => "Create a Bucket", "body" => "Click here to create a new bucket. You'll name it, pick an account, and optionally set a savings target.", "position" => "left" },
        { "step" => 3, "selector" => "[data-tutorial='bucket-fund-btn']", "title" => "Move Money", "body" => "Use the fund button to move money between buckets in the same account.", "position" => "left" },
      ]
    }
  },
  {
    key: "smart_import", display_name: "Smart Import", tagline: "Import bank statements automatically",
    description: "Upload CSV bank statements and let Smart Import classify, categorize, and create payments for you.",
    icon: "arrow-up-tray", category: "Accounts", tier: "paid", sort_order: 10, is_core: false, estimated_setup: "5 minutes",
    activate_path: "/smart_import",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='smart-import-wizard']", "title" => "Smart Import Wizard", "body" => "This step-by-step wizard guides you through importing bank transactions from a CSV file.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='smart-import-upload']", "title" => "Upload Your File", "body" => "Start by uploading a CSV file exported from your bank. We support most common bank statement formats.", "position" => "bottom" },
      ]
    }
  },
  {
    key: "reconciliation", display_name: "Reconciliation", tagline: "Verify your account balances match the bank",
    description: "Compare your tracked balance against your bank statement to catch missed transactions or errors.",
    icon: "check-circle", category: "Accounts", tier: "paid", sort_order: 11, is_core: false, estimated_setup: "5 minutes",
    activate_path: "/account_reconciliation",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='recon-account-select']", "title" => "Select an Account", "body" => "Choose which account you want to reconcile. Pick the account and month to compare.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='recon-table']", "title" => "Match Transactions", "body" => "Compare your recorded transactions against your bank statement. Check off items that match.", "position" => "bottom" },
      ]
    }
  },
  {
    key: "monthly_close", display_name: "Monthly Close", tagline: "Close out each month and lock it down",
    description: "Soft-close a month to snapshot balances and prevent accidental edits. Opens the next month automatically.",
    icon: "lock-closed", category: "Monthly", tier: "paid", sort_order: 12, is_core: false, estimated_setup: "1 minute",
    activate_path: "/soft_close",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='soft-close-info']", "title" => "Month Close Process", "body" => "Closing a month takes a snapshot of your balances and prevents accidental changes to past data.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='soft-close-btn']", "title" => "Close the Month", "body" => "When you're ready, click this button to close the current month and advance to the next one.", "position" => "top" },
      ]
    }
  },
  {
    key: "reports", display_name: "Reports", tagline: "See trends, breakdowns, and insights",
    description: "Analyze your finances with reports: spending by category, income by source, net worth over time, and more.",
    icon: "chart-bar", category: "Monthly", tier: "paid", sort_order: 13, is_core: false, estimated_setup: "Already set up",
    activate_path: "/reports",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='reports-grid']", "title" => "Available Reports", "body" => "Browse the available reports. Each card represents a different way to analyze your financial data.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='reports-period']", "title" => "Time Period", "body" => "Reports are shown for the current open month. Close months to build historical reports.", "position" => "bottom" },
      ]
    }
  },
  {
    key: "ss_planner", display_name: "SS Benefit Planner", tagline: "Plan your Social Security retirement benefits",
    description: "Model different retirement ages and see how they affect your monthly Social Security income.",
    icon: "calculator", category: "Planning", tier: "advanced", sort_order: 14, is_core: false, estimated_setup: "5 minutes",
    activate_path: "/social_security_planner",
    tutorial_data: {
      "steps" => [
        { "step" => 1, "selector" => "[data-tutorial='ss-assumptions']", "title" => "Your Assumptions", "body" => "Enter your Social Security details — birth date, earnings history, and planned retirement age.", "position" => "bottom" },
        { "step" => 2, "selector" => "[data-tutorial='ss-calculate-btn']", "title" => "Compare Scenarios", "body" => "Click to calculate and compare benefit amounts at different claiming ages. See the impact on your retirement income.", "position" => "left" },
      ]
    }
  },
]

blocks_data.each do |attrs|
  fb = FeatureBlock.find_or_initialize_by(key: attrs[:key])
  fb.assign_attributes(attrs.except(:key))
  fb.save!
end

puts "Seeded #{FeatureBlock.count} feature blocks"

# Seed dependencies (DAG from spec Section 2.2)
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

    FeatureBlockDependency.find_or_create_by!(
      feature_block_id: block_id,
      depends_on_id: dep_id
    )
  end
end

puts "Seeded #{FeatureBlockDependency.count} feature block dependencies"
