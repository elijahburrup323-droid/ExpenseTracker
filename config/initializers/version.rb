APP_VERSION = "1.1.2"
QA_MODE = false  # Set to true during production QA testing, false after moving to Ready for QA

# Full version history for Release Notes page (up to 30 entries)
APP_ALL_VERSIONS = [
  {
    version: "1.1.2",
    changes: [
      "Email switched from SMTP to SendGrid Web API (fixes Render timeout)",
    ]
  },
  {
    version: "1.1.1",
    changes: [
      "Payments header shows filtered total",
      "Accounts header shows in-budget balance total",
      "Deposits header shows total of all deposits",
    ]
  },
  {
    version: "1.1.0",
    changes: [
      "Quotes populate button seeds 201 quotes with authors from database",
      "All documentation pages exported to local folder on deploy",
      "Workflow updated: batch up to 5 items before deploy",
      "Production tests fixed to dismiss What's New popup",
    ]
  },
  {
    version: "1.0.9",
    changes: [
      "Sidebar submenu items sorted alphabetically",
      "Frequency submenus pinned to bottom of their groups",
      "Release Notes page shows full version history (up to 30)",
    ]
  },
  {
    version: "1.0.8",
    changes: [
      "QA Mode banner enlarged and sticky on scroll",
      "Release Notes documentation page shows full version history",
    ]
  },
  {
    version: "1.0.7",
    changes: [
      "Pie chart accounts sorted by descending balance",
      "Month/year text bolded in header bar",
      "QA Mode banner for production testing",
    ]
  },
  {
    version: "1.0.6",
    changes: [
      "Diagnostics admin page with email and SMS test buttons",
      "SMS phone number auto-normalized to E.164 format",
    ]
  },
  {
    version: "1.0.5",
    changes: [
      "Fixed email diagnostic to use proper mailer chain",
      "Release notes now show last 5 versions",
    ]
  },
  {
    version: "1.0.4",
    changes: [
      "Added admin diagnostic endpoint for email/SMS troubleshooting",
    ]
  },
  {
    version: "1.0.3",
    changes: [
      "What's New popup on first visit after deploy",
      "Version number displayed in footer",
    ]
  },
  {
    version: "1.0.2",
    changes: [
      "Email sender updated to verified SendGrid address",
      "Error handling added to email and SMS verification",
    ]
  },
  {
    version: "1.0.1",
    changes: [
      "Error handling for email and SMS send failures",
    ]
  },
  {
    version: "1.0.0",
    changes: [
      "Card 2 pie chart legend shows name, balance, and percentage",
      "Payment list scrolls to top after adding new payment",
      "Account balances refresh after payment add/edit/delete",
      "Quotes admin CRUD screen",
      "Daily motivational quotes in header bar",
      "Random quote on sign-in page",
      "Net worth chart with monthly snapshots",
      "Open month navigation on dashboard",
      "Dashboard cards with month navigation (Cards 1, 4, 5)",
      "Account transfers CRUD screen",
      "Settings page with email and phone management",
      "Two-factor authentication toggle",
      "DBU database utility (Schema Inspector + Record Browser)",
      "Documentation pages (schema, prompt, architecture, deployment)",
      "Legal pages (Privacy Policy, Terms of Service)",
      "Payments CRUD with advanced filtering and CSV export",
      "Deposits and Recurring Deposits screens",
      "Account Types with use_flag toggle",
      "Spending Types and Categories management",
      "Accounts CRUD with budget toggle",
      "Sidebar navigation with collapsible groups",
      "Dark mode / light mode toggle",
      "Devise authentication with OmniAuth providers",
    ]
  },
]

# What's New popup shows last 5 versions only
APP_VERSIONS = APP_ALL_VERSIONS.first(5)

# Current version's changes (for backward compat)
APP_CHANGELOG = APP_ALL_VERSIONS.first[:changes]
