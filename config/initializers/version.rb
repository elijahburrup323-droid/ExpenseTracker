APP_VERSION = "1.2.0"
QA_MODE = false  # Set to true during production QA testing, false after moving to Ready for QA

# Full version history for Release Notes page (up to 30 entries)
APP_ALL_VERSIONS = [
  {
    version: "1.2.0",
    changes: [
      "Accounts Add date validation against open month with effective date picker (CM-9)",
      "Server-side 409 rejection for account creation outside open month",
      "FrequencyMasters: Delete replaced with Deactivate/Reactivate for referential integrity (CM-7)",
      "FrequencyMasters: 'Income Entries' renamed to 'Deposits' throughout UI",
      "User Menu: Soft Close Month and Open Soft Close actions added to profile dropdown (CM-11)",
      "Soft Close snapshots current month and advances to next month",
      "Open Soft Close rolls back to previous month (blocked if transactions exist)",
      "DBU: All CRUD converted to modal-based workflow — read-only display with Edit/Add/Delete modals (CM-15)",
      "DBU: Sub-header made sticky beneath global header with 2-tier stacking",
      "DBU: Schema Inspector and Record Browser now share unified information_schema source",
    ]
  },
  {
    version: "1.1.9",
    changes: [
      "Payments Edit converted from inline row editing to centered modal workflow",
      "Edit modal reuses Add modal field set, validation, and styling with pre-populated values",
      "Month control on Edit — blocks editing payments outside the current open month",
      "Server-side month enforcement returns 409 Conflict for out-of-month edits",
    ]
  },
  {
    version: "1.1.8",
    changes: [
      "Payments delete validation against open month — blocks deleting payments outside current month",
      "Deposits total enlarged, date validation on Add/Edit, delete validation against open month",
      "Accounts open month gating — blocks Add/Edit/Delete when month is closed",
      "Transfers date validation on Add/Edit save, delete validation against open month",
      "Soft Close architecture: has_data flag on open month tracks first data entry per month",
      "Reopen previous month endpoint with has_data eligibility gating",
      "Account and Dashboard month snapshots generated on month close/advance",
      "Snapshot tables marked stale on reopen (Option A)",
    ]
  },
  {
    version: "1.1.7",
    changes: [
      "Payments Total text enlarged to 75% of heading size (text-lg font-semibold) for visual emphasis",
      "Payment date validation against current open month on Add and Edit",
      "Date warning modal when payment date falls outside open month with Cancel/Proceed options",
      "Proceed advances open month to match payment date and saves the payment",
    ]
  },
  {
    version: "1.1.6",
    changes: [
      "Subscription pricing page with 3 tiers: Free, Paid ($3.99/mo or $25/yr), Advanced ($5.99/mo or $35/yr)",
      "Monthly/Annual billing toggle with dynamic price and savings display",
      "Upgrade menu item added to profile dropdown (header + sidebar)",
      "Subscribe and Renew buttons on Settings page now link to pricing page",
      "CSV Upload/Import feature on all 9 data screens (admin only)",
      "Payments Print button generates print-friendly report with BudgetHQ header",
      "Template download format selection: CSV or Excel with localStorage persistence",
    ]
  },
  {
    version: "1.1.5",
    changes: [
      "CSV Upload/Import feature on all 9 data screens (admin only)",
      "Download template, upload CSV, validate inline, batch import via API",
      "Payments Print button generates print-friendly report with BudgetHQ header",
      "Print mirrors current filters, sorting, and shows totals",
    ]
  },
  {
    version: "1.1.4",
    changes: [
      "Accounts total now sums ALL accounts regardless of In Budget toggle",
      "Sidebar toggle button added to header bar (always accessible on desktop/tablet)",
      "Sidebar height fixed for iPad Safari (dynamic viewport height)",
    ]
  },
  {
    version: "1.1.3",
    changes: [
      "Dashboard Card 2 expand/collapse control (fill full dashboard area)",
      "ESC key collapses expanded Card 2",
      "Expand icon visible on both front (accounts) and back (pie chart) sides",
    ]
  },
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
