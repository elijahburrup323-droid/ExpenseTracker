APP_VERSION = "1.3.13"
QA_MODE = true  # Set to true during production QA testing, false after moving to Ready for QA
MANUAL_CHANGE_SEQ = 0  # Manual Change Requests sequence for current version. Reset to 0 when bumping APP_VERSION.

# Full version history for Release Notes page (up to 30 entries)
APP_ALL_VERSIONS = [
  {
    version: "1.3.13",
    changes: [
      "Admin: New Reports Maintenance screen for managing global report definitions and slot assignments (CM-23)",
      "Admin: Add/Edit reports via modal with icon picker, category, description, route path, and slot assignment (CM-23)",
      "Admin: Expandable slot system — Add Slot button creates new slots beyond the default 9 (CM-23)",
      "Admin: Soft-delete reports (deactivate + unassign slot) with in-use count display (CM-23)",
      "Database: New tables — reports_masters, reports_slots_masters, reports_menu_layouts (CM-23)",
      "Reports: Report definitions now database-driven instead of hardcoded constant (CM-23)",
      "Reports: Icon rendering via icon catalog with 3 new icons (archive, check-circle-outline, lock) (CM-23)",
      "Account Types: View All toggle — switch between enabled-only and all available types (CM-7)",
      "Account Types: Click-to-edit description — customize descriptions per user with Reset to master option (CM-7)",
      "Database: Added custom_description column to user_account_types for per-user description overrides (CM-7)",
      "Reports: New Monthly Cash Flow report — Beginning Balance, Deposits, Payments, Net Cash Flow, Ending Balance (CM-8)",
      "Reports: Expandable detail sections — Deposits by Account and Payments by Category breakdowns (CM-8)",
      "Reports: Month navigation on report page with prev/next arrows (CM-8)",
      "Reports: Cards on Reports Menu now link to report pages when available, 'Coming Soon' for others (CM-8)",
      "Reconciliation: Collapsible group sections — click header to expand/collapse Payments, Deposits, Transfers, Adjustments (CM-9)",
      "Reconciliation: Auto-collapse empty groups and fully reconciled groups on load (CM-9)",
      "Reconciliation: Collapse state persists per user/account/month — survives page reload (CM-9)",
      "Reconciliation: Keyboard accessible (Enter/Space) group toggle with chevron indicator (CM-9)",
      "Database: New reconciliation_group_ui_states table for persisted collapse preferences (CM-9)",
      "Reports/Dashboard: Critical grid CSS loaded in head to prevent single-column flash on Turbo navigation (CM-11)",
      "Reports: Monthly Cash Flow card link now includes relative_url_root prefix — resolves 404 on production (CM-12)",
    ]
  },
  {
    version: "1.3.12",
    changes: [
      "User Menu: Removed Soft Close Month and Open Soft Close from user dropdown — accessible via Monthly nav only (CM-21)",
      "Reports: New Reports Menu screen under Monthly > Reports with 9 report cards in 3x3 grid (CM-22)",
      "Reports: Drag-and-drop card reorder with per-user slot persistence via SortableJS (CM-22)",
      "Reports: Category badges, icons, and descriptions on each report card (CM-22)",
    ]
  },
  {
    version: "1.3.11",
    changes: [
      "Admin: Account Type Masters Active column now uses slider toggle instead of badge buttons (CM-16)",
      "Admin: Account Type Masters shows Description column instead of Key column (CM-20)",
      "Quotes: Sortable column headers — click Quote, Author, or Active to sort with visual arrow indicators (CM-2)",
      "Dashboard: Drag-and-drop card reorder already implemented in v1.2.7 — confirmed working (CM-3)",
    ]
  },
  {
    version: "1.3.10",
    changes: [
      "Spending Limits: New history-aware monthly limits with effective-dated versioning (CM-13)",
      "Spending Categories: Monthly Limit $ column — set, edit, and remove dollar-amount limits per category (CM-13)",
      "Spending Types: Monthly Limit % column — set, edit, and remove percentage limits per type (CM-13)",
      "Dashboard: Spending Overview back card shows progress bars for category limits and over/under indicators for type limits (CM-13)",
      "API: New /api/spending_limits endpoints (GET/POST/DELETE) with history-aware versioning (CM-13)",
    ]
  },
  {
    version: "1.3.9",
    changes: [
      "Admin: Fixed Account Type Masters data loading — Stimulus controller was not registered, table stayed on 'Loading...' (CM-14)",
      "Reconciliation: Made Reconcile Balance header sticky — title, search, and account selector stay pinned below global header on scroll (CM-15)",
    ]
  },
  {
    version: "1.3.8",
    changes: [
      "Payments: Default sort changed from Date Ascending to Date Descending — newest payments appear first (CM-11)",
      "Payments: Description field autocomplete — type 2+ characters to see suggestions from past payments (CM-12)",
      "Payments: Suggestions ranked by prefix match, frequency, then recency with category-scoped search (CM-12)",
      "Payments: Keyboard navigation (Up/Down/Enter/Tab/Esc) and ARIA combobox roles on suggestion dropdown (CM-12)",
    ]
  },
  {
    version: "1.3.7",
    changes: [
      "Recurring Deposits: Renamed 'Income Sources' to 'Deposit Sources' throughout the screen (CM-9)",
      "Frequencies: Updated helper text to reference 'deposit sources' instead of 'income sources' (CM-9)",
      "Reconciliation: Removed month navigation — screen now shows current open month only as static text (CM-10)",
      "Reconciliation: Server-side enforcement — all API endpoints forced to current open month regardless of URL params (CM-10)",
    ]
  },
  {
    version: "1.3.6",
    changes: [
      "Account Types: Converted to master/user pattern — global AccountTypeMasters table with per-user UserAccountTypes toggle (CM-8)",
      "Account Types: User screen now shows toggle switches to enable/disable master types instead of full CRUD (CM-8)",
      "Admin: New Acct Type Masters screen for managing global account types (add, edit, delete with in-use protection) (CM-8)",
      "Accounts: Dropdown now sources from master types via user selections instead of legacy account_types table (CM-8)",
    ]
  },
  {
    version: "1.3.5",
    changes: [
      "Accounts: Double-click account name navigates to Account Reconciliation with that account pre-selected (CM-7)",
      "Reconciliation: Auto-selects account from query param on page load for seamless cross-screen navigation (CM-7)",
    ]
  },
  {
    version: "1.3.4",
    changes: [
      "Navigation: New top-level 'Monthly' menu group added between Payments and Admin (CM-6)",
      "Navigation: Soft Close Month consolidated under Monthly — removed duplicate Month subgroups from Accounts, Deposits, and Payments (CM-6)",
    ]
  },
  {
    version: "1.3.3",
    changes: [
      "Soft Close: Removed reconciliation checklist item — month close no longer depends on reconciliation status (CM-5)",
      "Soft Close: Close Month button now enables when both confirmation checkboxes are checked, independent of system checks (CM-5)",
      "Navigation: New 'Month' submenu group added under Accounts, Deposits, and Payments (CM-5)",
      "Navigation: Soft Close Month moved under Month submenu in all three nav groups (CM-5)",
    ]
  },
  {
    version: "1.3.2",
    changes: [
      "Navigation: Soft Close Month menu item added under Accounts sidebar group (CM-4)",
    ]
  },
  {
    version: "1.3.1",
    changes: [
      "Account Reconciliation: New screen under Accounts menu for reconciling individual accounts per month",
      "Account Reconciliation: Compare BudgetHQ balance against external/statement balance with real-time difference",
      "Account Reconciliation: Checkbox-driven reconciliation for Payments, Deposits, Transfers, and Balance Adjustments",
      "Account Reconciliation: Fix Mode with guided troubleshooting — Unmatched Payments, Deposits, and Suggested Fixes",
      "Account Reconciliation: Add Balance Adjustments directly from reconciliation screen",
      "Account Reconciliation: Auto-Match Suggestions to detect count mismatches and identify discrepancies",
      "Account Reconciliation: Mark as Reconciled when difference equals zero with server-side validation",
      "Account Reconciliation: Read-only mode for non-current months; month navigation with chevrons",
      "Balance Adjustments: New entity type for manual account balance corrections",
      "Soft Close: Reconciliation checklist item now checks for unreconciled transactions",
    ]
  },
  {
    version: "1.3.0",
    changes: [
      "Soft Close Month: Dedicated screen with live 10-item validation checklist (CM-5)",
      "Soft Close: System checks validate recurring generation, required fields, account assignment, transfer validity",
      "Soft Close: User must confirm totals review and final lock consent before closing",
      "Soft Close: Month summary shows Payments, Deposits, Transfers, Beginning/Ending Balance, Net Change",
      "Soft Close: Checklist auto-refreshes every 5 seconds via polling API endpoint",
      "Soft Close: Atomic close with snapshots, month advance, and redirect to dashboard",
      "Navigation: Soft Close menu item now navigates to dedicated page instead of simple modal",
    ]
  },
  {
    version: "1.2.9",
    changes: [
      "Dashboard: Spending Overview flip card now shows dual breakdown — By Category and By Spending Type (CM-13)",
      "Dashboard: Both breakdowns include color-coded dots, amounts, percentages, and totals",
      "Dashboard: Spending by Type aggregates payments through SpendingCategory → SpendingType relationship",
      "Dashboard: AJAX month navigation updates both breakdowns dynamically",
    ]
  },
  {
    version: "1.2.8",
    changes: [
      "Deposits: Converted Add/Edit from inline table-row editing to centered modal workflow (CM-9)",
      "Spending Categories: Converted Add/Edit from inline editing to modal workflow (CM-11)",
      "Spending Types: Converted Add/Edit from inline editing to modal workflow (CM-12)",
      "All three screens: Table is now always read-only — no more inline input rows",
      "All three screens: Icon picker, keyboard handling (Enter/Escape), error display all work within modal",
    ]
  },
  {
    version: "1.2.7",
    changes: [
      "Dashboard: Cards vs Slots architecture — card identity separated from layout position (CM-11)",
      "Dashboard: Drag-and-drop reorder via SortableJS — cards can be moved between slots and positions persist",
      "Dashboard: Slot-driven rendering pipeline — cards render by card_type, not position number",
      "Dashboard: Reorder API endpoint (PUT /api/dashboard/reorder_slots) persists slot assignments",
      "Database: New tables — dashboard_cards, dashboard_slots, dashboard_card_account_rules, dashboard_card_account_rule_tags",
      "Database: Tags system — tags and tag_assignments tables for future tag-driven account inclusion",
      "Dashboard: Default cards auto-seeded for new and existing users on first dashboard load",
      "Dashboard: Generic flip and expand/collapse — works on any card in any slot position",
    ]
  },
  {
    version: "1.2.6",
    changes: [
      "Dashboard: All 6 cards now compute from transactions and update on month navigation (CM-3)",
      "Dashboard: Accounts card (Card 2) shows computed balances-as-of for any selected month",
      "Dashboard: Net Worth card (Card 3) updates value and chart when navigating months",
      "Dashboard: Income & Spending card (Card 4) beginning/current balance computed from transactions, not static fields",
      "Dashboard: New AccountBalanceService computes balance-as-of from beginning_balance + deposits - payments +/- transfers",
      "DBU: Schema Inspector and Record Browser now share unified table descriptions and cross-tab refresh sync",
      "Payments: Default date filter set to current month (first of month through today)",
      "Documentation: Updated all documentation pages to match current system state",
      "Database Schema: Added missing created_at/updated_at timestamps for income_recurrings and income_entries tables",
      "Deployment Runbook: Corrected deploy time from ~4 minutes to ~2 minutes",
      "Database Visualization: Fixed legend color for Accounts (green-600 to match diagram)",
      "Test Coverage: Expanded Screen Coverage Matrix from 7 to 15 screens with full test file inventory",
      "Upload: CSV upload/import feature now available to all user accounts (not just admin)",
    ]
  },
  {
    version: "1.2.5",
    changes: [
      "Dashboard: Added Spending Overview card (Card 1) flip feature — pie-chart icon in lower-left flips to show Spending by Category breakdown (CM-2)",
      "Dashboard: Category breakdown shows categories sorted by amount DESC with color dot, name, amount, and percentage of total spending",
      "Dashboard: Category breakdown updates via AJAX when navigating months, matching existing Card 2 flip pattern",
    ]
  },
  {
    version: "1.2.4",
    changes: [
      "Dashboard: Fixed month-scoping bug — Cards 1, 4, and 5 now use open_month_master as single source of truth instead of Date.today (CM-1)",
      "Dashboard: 'New Account Added' lines on Card 4 only appear for accounts created within the selected open month",
      "Dashboard: Card 5 (Recent Activity) now month-scoped to the open month instead of showing all-time recent payments",
      "Dashboard: All date queries use half-open interval [month_start, month_end) for consistent month filtering",
    ]
  },
  {
    version: "1.2.3",
    changes: [
      "Documentation: Updated all 8 documentation pages to match current system state",
      "Database Schema: Added missing created_at/updated_at columns and indexes for income_frequency_masters and income_user_frequencies",
      "Claude Prompt: Added Diagnostics page, transfer_masters and net_worth_populate Stimulus controllers, fixed admin sidebar listing",
      "Architecture Overview: Added Transfers, Diagnostics, and Quotes to sidebar diagram; updated profile dropdown items",
      "Database Visualization: Added 11 auxiliary tables section (transfers, snapshots, quotes, legal_pages, etc.)",
      "Environment Variables: Added CI env var, corrected SendGrid description to Web API (not SMTP)",
      "Deployment Runbook: Fixed script reference from export_docs.js to create_docx.js",
    ]
  },
  {
    version: "1.2.2",
    changes: [
      "Upload: Added Apple Numbers template format option alongside CSV and Excel",
      "Upload: Numbers template uses UTF-8 BOM for proper encoding in Apple Numbers",
      "Upload: Instruction text updated with Apple Numbers export guidance",
      "Upload: Format selection persisted in localStorage across sessions",
    ]
  },
  {
    version: "1.2.1",
    changes: [
      "FrequencyMasters: Removed Deactivate/Reactivate action buttons — Active toggle is now the sole activation control",
      "FrequencyMasters: Added Delete action with in-use protection (can_delete endpoint)",
      "FrequencyMasters: Cannot-delete modal blocks deletion when frequency is referenced by any user",
      "FrequencyMasters: Standard delete-confirm modal for unused frequencies with server-side race condition guard",
    ]
  },
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
