APP_VERSION = "1.3.78"
QA_MODE = false  # Set to true during production QA testing, false after moving to Ready for QA
TEXT_SCALE_TEST_MODE = true  # true = show text scale control on every page for all users; false = Settings only
MANUAL_CHANGE_SEQ = 0  # Manual Change Requests sequence for current version. Reset to 0 when bumping APP_VERSION.

# Module killswitches — set to false to instantly disable a module for ALL users.
# When disabled: sidebar nav hidden, controllers return 404/redirect, Net Worth excludes module.
# Data is preserved. Re-enable by setting back to true and redeploying.
FEATURE_ASSETS_ENABLED = true
FEATURE_INVESTMENTS_ENABLED = true
FEATURE_FINANCING_ENABLED = true

# Full version history for Release Notes page (up to 30 entries)
APP_ALL_VERSIONS = [
  {
    version: "1.3.78",
    changes: [
      "Recent Activity Card: Front side now shows only Recent Payments; back side shows only Recent Deposits.",
      "Recent Activity Card: Payment amounts in red, deposit amounts in green, with per-side totals and counts.",
      "Recent Activity Card: Both sides support internal scrolling within fixed card height.",
      "API: Returns separate payments and deposits arrays for Card 5."
    ]
  },
  {
    version: "1.3.77",
    changes: [
      "Accounts Card: Front side now shows Total Cash, Credit Card Balance, and Loans & Financing Balance.",
      "Accounts Card: Liabilities (credit cards and loans) displayed in red on front side.",
      "Accounts Card: API returns credit_total and loan_total for front-side rendering."
    ]
  },
  {
    version: "1.3.76",
    changes: [
      "Feature Store: Reorganized into 4 groups — Core Features, Premium Features, Advanced Tools, Available Add-Ons.",
      "Feature Store: Core modules (Dashboard, Accounts, Payments, Income/Deposits, Transfers, Tags, Buckets) are always-on and cannot be deactivated.",
      "Feature Store: Removed duplicate Recurring Income and Recurring Payments blocks (merged into Income/Deposits and Payments).",
      "Feature Store: Renamed 'Income' to 'Income / Deposits' for clarity.",
      "Feature Store: Setup time hidden for core features; descriptions updated to reflect merged recurring functionality."
    ]
  },
  {
    version: "1.3.75",
    changes: [
      "Onboarding: Removed use-case selection wizard — all menu items now visible immediately for new accounts.",
      "Onboarding: New users auto-complete onboarding with all features activated (no redirect to wizard)."
    ]
  },
  {
    version: "1.3.74",
    changes: [
      "Income & Spending: Current Balance now derived deterministically from Beginning Balance + Deposits − Payments (no longer from account balance snapshots).",
      "Income & Spending: Transfers no longer distort the Current Balance display.",
      "Spending Overview: Expanded backside opens full-size with 4-column Spending Breakdown — By Category, By Spending Type, By Tag, and Deposits Breakdown.",
      "Spending Overview: Each column shows items with amounts and percentages, with a total at the bottom.",
      "Spending Overview: Deposits Breakdown groups income entries by description for the selected month."
    ]
  },
  {
    version: "1.3.73",
    changes: [
      "Spending Overview: Simplified front card showing only Spent This Month and Cash In Spending Accounts with large display fonts.",
      "Spending Overview: Back card redesigned with Recurring Bills Remaining, Current Deposits (upcoming recurring deposits), and Cash Available To Spend.",
      "Spending Overview: Cash Available To Spend = Cash In Spending Accounts + Remaining Deposits - Remaining Bills.",
      "Spending Overview: Individual deposit and bill line items shown beneath section totals."
    ]
  },
  {
    version: "1.3.72",
    changes: [
      "Spending Overview: New financial flow layout showing Available Cash, Recurring Bills Remaining, Estimated Variable Spending, and Projected Safe To Spend.",
      "Spending Overview: Estimated Variable Spending uses trimmed historical averages (last 6 months) per category, subtracting amount already spent in current month.",
      "Spending Overview: Categories with spending limits use the limit value; categories without use historical average.",
      "Spending Overview: Individual recurring bill and variable spending sub-items now shown with indented detail rows."
    ]
  },
  {
    version: "1.3.71",
    changes: [
      "Spending Overview: Planned amount now uses month-scoped recurring payment occurrences instead of 3-month historical average.",
      "Spending Overview: Weekly/biweekly recurring payments correctly contribute multiple occurrences when applicable.",
      "Spending Overview: Recurring payments with next dates outside the open month no longer inflate the planned total."
    ]
  },
  {
    version: "1.3.70",
    changes: [
      "Transaction Engine: Full dual-write — Payments, Deposits, and Transfers screens now sync all CRUD operations to the canonical transactions table via migration map.",
      "Transaction Engine: Recurring payment and deposit generation now creates canonical transaction records alongside legacy records.",
      "Transaction Engine: Reports module refactored to read from transactions table — cash flow, spending by category/type, income by source, and reconciliation reports now use unified data source.",
      "Transaction Engine: Legacy freeze guard — model-level write protection for legacy tables, activated via LEGACY_TABLES_FROZEN env var.",
      "Transaction Engine: Preparation for legacy table removal after rollback window — compatibility views and migration map preserved for audit."
    ]
  },
  {
    version: "1.3.69",
    changes: [
      "Transaction Engine: Canonical transactions table with payment/deposit/transfer types, DB-level CHECK constraints, soft delete, positive-amount enforcement, and composite performance indexes.",
      "Transaction Engine: LedgerMath concern — codified balance derivation rules, spending/income totals, transfer neutrality, and virtual bucket convention."
    ]
  },
  {
    version: "1.3.68",
    changes: [
      "Dashboard: Recent Activity flip redesign — Expanded Visibility Model (Instruction S). Flip now auto-expands the card and shows full Monthly Activity with all payments and deposits, category labels on payments, muted color tones. Flip-back auto-collapses. No filters, sorting, or chart controls on flip side.",
      "Dashboard: Recent Activity front refinement — Calm Scroll Model (Instruction R). Muted color tones for payment amounts (red-400/80) and deposit amounts (emerald-500/80). Net activity summary uses same muted palette. Colors persist across month navigation via JS renderer."
    ]
  },
  {
    version: "1.3.67",
    changes: [
      "Dashboard: Recent Activity front refinement — Calm Scroll Model (Instruction R). Front now shows merged payments + deposits in one chronological list. Payments in muted red (−), deposits in muted green (+). Removed colored icon badges. Fixed-height card with internal scroll. No transfers displayed. Back side unchanged."
    ]
  },
  {
    version: "1.3.66",
    changes: [
      "Dashboard: Buckets card flip redesign — Structured Goal Progress Model (Instruction Q). Back side now shows 'Goal Progress' with total saved pinned at top, priority-sorted bucket list with name, current amount, target, remaining, and subtle progress bars. Removed account group headers, max spend, and available-to-spend from flip. Flip auto-expands and auto-collapses the card."
    ]
  },
  {
    version: "1.3.65",
    changes: [
      "Dashboard: Buckets card front redesign — Calm Goals Snapshot Model (Instruction P). Front now shows centered '$X saved in goals' with 'Across X active buckets' and optional 'Largest: Bucket Name ($X)'. Removed individual bucket listings, progress bars, and percentage displays from front. Back side unchanged."
    ]
  },
  {
    version: "1.3.64",
    changes: [
      "Dashboard: Income & Spending card flip redesign — Expanded Clarity Model (Instruction O). Back side now shows 'Monthly Details' with equation stack at top, Net Change, Top 3 Payments (by category), and Top 3 Deposits (by source). Recent Deposits list removed from flip. Flip auto-expands and auto-collapses the card. API now returns top_payments and top_deposits for JS month navigation."
    ]
  },
  {
    version: "1.3.63",
    changes: [
      "Dashboard: Income & Spending card front redesign — Calm Snapshot Model (Instruction N). Front now shows clean 4-line equation stack: Beginning Balance, + Deposits, − Payments, = Current Balance (visually dominant). Removed Net Change, Savings Rate, New Account Added sections, and colored icon badges from front. Muted gray tones throughout. Back side unchanged."
    ]
  },
  {
    version: "1.3.62",
    changes: [
      "Dashboard: Net Worth card flip redesign — Expanded Insight Model (Instruction M). Back side now shows 'Net Worth History' with current value pinned at top, conditional trend graph (Instruction H rules), and monthly snapshot list with month-over-month changes (newest first). Component breakdown (Accounts/Assets/Investments/Liabilities totals) removed from flip. Flip auto-expands and auto-collapses the card."
    ]
  },
  {
    version: "1.3.61",
    changes: [
      "Dashboard: Net Worth card front redesign — Calm Snapshot Model (Instruction L). Front now shows centered 'Net Worth: $X' with optional muted 'Change this month: +/-$Y' (suppressed when fewer than 2 months of history). Removed Assets/Liabilities breakdown and Debt Ratio/Cash Coverage metric from front. Back side unchanged."
    ]
  },
  {
    version: "1.3.60",
    changes: [
      "Dashboard: Accounts card flip redesign — Grouped Structure Model (Instruction K). Back side now shows 3 collapsible sections: Liquid Accounts (expanded by default), Credit Accounts (collapsed), and Loans/Financing (collapsed). Each section lists accounts with balances and subtotals. Replaces previous Assets vs Liabilities horizontal bar comparison. Added CREDIT_TYPE_KEYS constant to AccountTypeMaster for revolving credit types. API includes account_group per account (liquid/credit/loan/other_asset)."
    ]
  },
  {
    version: "1.3.59",
    changes: [
      "Dashboard: Accounts card front redesign — Calm Cash Model (Instruction J). Front now displays only 'Total Cash: $X' (large, dominant) and 'Across N liquid accounts' (smaller). Liquid accounts defined as Checking, Savings, High Yield Savings, Money Market, and Cash Card. Removed individual account listing, pie chart, and credit/loan balances from front. Back side retains Assets vs Liabilities comparison unchanged. Added LIQUID_TYPE_KEYS constant and liquid_type_ids class method to AccountTypeMaster. API includes liquid_total and liquid_count in accounts_overview response."
    ]
  },
  {
    version: "1.3.58",
    changes: [
      "Dashboard: Net Worth conditional graph logic (Instruction H). Graph only renders when >= 2 months of historical data exist. Removed single-dot placeholder SVG for 1-month users. Shows contextual message instead: 'No history yet' (0 months) or 'Chart available after 2+ months' (1 month). Applied to both server-rendered ERB and client-side JS re-render paths."
    ]
  },
  {
    version: "1.3.57",
    changes: [
      "Dashboard: Enforce Calm Fronts (Instruction G). Removed SVG trend chart from Net Worth card front and relocated it to the flip (back) side. Removed progress bars from Buckets card front (both simple and expanded layouts) and relocated them to the flip side. All 6 dashboard card fronts are now text-first with no charts or visual bars."
    ]
  },
  {
    version: "1.3.56",
    changes: [
      "Dashboard: Fixed Accounts card report icon disappearing after JS re-render. The client-side _renderAccountsOverview now includes the bar-chart report icon in both front and back headers, matching the server-rendered ERB template."
    ]
  },
  {
    version: "1.3.55",
    changes: [
      "Dashboard: Standardized card flip philosophy (Front = Calm Snapshot, Flip = Directional Insight, Report = Deep Analysis). Added report icons to all 6 dashboard card headers linking to corresponding report pages. Fixed pointer-events on Accounts card back side for WebKit compatibility."
    ]
  },
  {
    version: "1.3.54",
    changes: [
      "Dashboard Slot 1: Report Icon. Added a bar-chart icon to the Slot 1 header (both front and back sides) that navigates to the full Spending by Category report page. Also fixed initial pointer-events on the flip card back side for better WebKit compatibility."
    ]
  },
  {
    version: "1.3.53",
    changes: [
      "Dashboard Slot 1: Spending Control Panel. Redesigned flip/back side into a directional control panel with Plan vs Spent, dual pacing bars (spending used vs month elapsed), On Track indicator, end-of-month projection, top 3 spending drivers, and pacing guidance. Flip now auto-expands the card; flip-back auto-collapses. Removed full category/type/tag breakdown from flip view."
    ]
  },
  {
    version: "1.3.52",
    changes: [
      "Dashboard Slot 1: Calm Snapshot Redesign. Replaced Safe to Spend breakdown with a calm spending summary. Dynamic headline shows remaining budget or total spent based on 3-month average plan. Secondary line shows spent vs planned. Per-day pacing text shows daily available, plan reached, or plan exceeded. Muted slate/gray tones replace aggressive green/red coloring."
    ]
  },
  {
    version: "1.3.51",
    changes: [
      "Dashboard: Reduce Vertical Dead Space. Compressed internal card padding (p-4/p-6 → p-3/p-5), tightened header-to-body gaps (mb-4 → mb-2), reduced content row spacing, and narrowed grid gaps. Footer top padding reduced from 8px to 4px. All six cards fit more content in the same viewport with no typography or layout structure changes."
    ]
  },
  {
    version: "1.3.50",
    changes: [
      "Dashboard: iPad Grid Lock v2. Replaced fixed calc() offset with flex-based viewport lock. The dashboard grid now automatically fills remaining viewport space after header/banner/pulse, eliminating overflow on all iPad landscape sizes. Uses CSS :has() to scope layout changes to dashboard page only."
    ]
  },
  {
    version: "1.3.48",
    changes: [
      "Assets: Smart Duplicate Handling. When adding a unit-based asset (Precious Metals, Crypto) that already exists, the system now prompts to add the purchase as a new lot instead of showing a 'Name already taken' error. Gold, Silver, BTC, etc. consolidate into a single holding with multiple purchase lots.",
      "Assets: Unit Conversion Support. Purchase lots can now be entered in non-canonical units (e.g., grams for metals) and are automatically converted to the canonical unit (oz) for aggregation. A canonical quantity preview shows the converted value in real time."
    ]
  },
  {
    version: "1.3.47",
    changes: [
      "Dashboard: Spending Overview now shows Safe to Spend based on operating accounts only (Checking, Cash Card). The donut chart is replaced with a structured breakdown: Current Operating Balance + Scheduled Deposits - Scheduled Payments. Savings and other reserve accounts are shown separately as Reserved in Savings. An info tooltip explains the distinction. Net Worth, Accounts, and other cards remain unchanged."
    ]
  },
  {
    version: "1.3.46",
    changes: [
      "Soft Close Month: Checklist Drill-Down. Failing (red) checklist items are now fully clickable rows that navigate directly to the screen with the problem. Each destination shows a Soft Close Fix banner with a plain-English explanation of what's wrong and how to fix it, plus a Back to Soft Close link. Failing records are highlighted in yellow with a Needs Fix badge, and the first failing record's edit modal auto-opens. Covers: invalid transfers, payments missing accounts, incomplete payments, incomplete deposits, and ungenerated recurring deposits."
    ]
  },
  {
    version: "1.3.45",
    changes: [
      "Dashboard: First Login Wizard. When a user has zero accounts, a mandatory onboarding wizard appears as a modal overlay on the Dashboard. Steps: Welcome → Select Account Type (Checking/Savings/Cash) → Enter Name + Balance → Create Account → Add Another or Finish. The wizard cannot be dismissed (ESC and click-outside blocked) until at least one account exists. After the first account is created, the dashboard reloads and the wizard does not reappear."
    ]
  },
  {
    version: "1.3.44",
    changes: [
      "Dashboard: Viewport-Locked Card Height. The 3x2 dashboard grid now uses a deterministic CSS calc (100vh - 13rem) to ensure all 6 cards are fully visible without vertical scrolling on standard desktop viewports (validated at 1440x900 @ 100% zoom). Card heights are perfectly equal (334px each) and locked — content changes cannot cause auto-expanding cards. Replaces the previous fixed 28rem card height."
    ]
  },
  {
    version: "1.3.43",
    changes: [
      "Dashboard: Net Worth Chart Tooltips. Clicking or tapping a data point on the Net Worth trend chart now shows a tooltip with the exact month label and net worth value (e.g., 'Jan 2026 — $1,067.18'). Works on desktop (click to pin, click elsewhere to dismiss) and touch devices (tap to show, tap elsewhere to dismiss). Tooltip auto-positions to stay within the card bounds."
    ]
  },
  {
    version: "1.3.42",
    changes: [
      "Soft Close Month: Fixed false-positive transfer validation that blocked month close for users with bucket reallocations (same-account transfers between different buckets). Improved error UX: failed checklist items now show specific actionable messages with clickable links to review invalid records. Close Month button stays disabled until all system checks pass."
    ]
  },
  {
    version: "1.3.41",
    changes: [
      "Dashboard: State Persistence. The Dashboard now remembers your current UI state — flipped cards, expanded cards, selected tag filters, and month selection — when you navigate away and return. Clicking the MyBudgetHQ logo while already on the Dashboard resets to the default landing state (6 cards, all front sides). State is user-scoped via sessionStorage and automatically cleared on sign out to prevent cross-user leakage."
    ]
  },
  {
    version: "1.3.40",
    changes: [
      "Dashboard: Net Worth Card Breakdown. The back of the Net Worth card now displays a component breakdown showing Accounts Total, Assets Total, Investments Total, and Liabilities Total, reconciling exactly with the front-of-card Net Worth value. Replaces the previous snapshot history view. Debt Ratio vs Cash Coverage metric swap now renders correctly in both server-rendered and JavaScript-rendered modes with proper color-coded thresholds."
    ]
  },
  {
    version: "1.3.39",
    changes: [
      "Text Scale: Sidebar Exclusion. The global text size control (A-/A/A+) now scales only the main content area. The left sidebar navigation menu text remains at the design-system base size regardless of the user's text scale preference, preventing sidebar overflow and preserving navigation readability at all scale levels."
    ]
  },
  {
    version: "1.3.38",
    changes: [
      "Assets: Unit-Based Lot Tracking for Precious Metals and Cryptocurrency. Add Asset modal now shows quantity, unit label, and initial purchase lot fields when selecting Precious Metals or Crypto types. Asset Detail page includes a new Purchase Lots tab for managing multiple lots, unit-based overview with holdings, cost basis, unrealized gain/loss, and inline price update control. Lot rollups (total quantity, total cost basis) are maintained automatically. Current value is computed from quantity x price per unit. All existing non-unit asset types are unchanged."
    ]
  },
  {
    version: "1.3.37",
    changes: [
      "Dashboard Accounts Card (Slot 2): Header now shows 'Accounts Total' instead of 'Net Worth' to prevent visual contradiction with Slot 3 (Net Worth). Total reflects account balances only — excludes Assets, Investments, and Financing modules. Derived from canonical Account.net_worth_for[:accounts_total]."
    ]
  },
  {
    version: "1.3.36",
    changes: [
      "Net Worth Chart Fix: Backfill now uses AccountMonthSnapshot (the reliable source for all closed months) instead of DashboardMonthSnapshot. Fixes missing historical months on the Net Worth chart for users whose months were closed before DashboardMonthSnapshot was introduced. Both SSR and API dashboard now trigger backfill. Tooltip added for single-data-point charts."
    ]
  },
  {
    version: "1.3.35",
    changes: [
      "Spending Breakdown drill-down: Click any Category, Spending Type, or Tag in the Spending Breakdown (Card 1 back) to navigate to Payments filtered to that item. Month context is preserved. Filter dropdowns are visibly set on arrival."
    ]
  },
  {
    version: "1.3.34",
    changes: [
      "Payments: Closed-month payments now allow classification-only edits (Category, Spending Type, Tags, Description). Amount, Account, and Date fields are disabled and read-only. No balance or snapshot impact."
    ]
  },
  {
    version: "1.3.33",
    changes: [
      "Feature Flags: Global killswitch constants (FEATURE_ASSETS_ENABLED, FEATURE_INVESTMENTS_ENABLED, FEATURE_FINANCING_ENABLED) and server-side FeatureGate concern. Controllers return 403/redirect when module disabled. Net Worth aggregator respects both global and per-user flags. Sidebar hides disabled modules."
    ]
  },
  {
    version: "1.3.32",
    changes: [
      "Net Worth Engine: Dashboard, snapshots, and reports now use the canonical Account.net_worth_for aggregator. Net Worth = Accounts + Assets + Investments + Receivables − Liabilities − Payables. Fixes dashboard showing only cash account balances when Assets/Investments exist."
    ]
  },
  {
    version: "1.3.31",
    changes: [
      "Dashboard: Net Worth card now automatically swaps the secondary metric based on asset composition. Users with non-cash assets (investments, real estate, receivables) see Debt Ratio; cash-dominant users see Cash Coverage instead. Deterministic logic, no user toggle required."
    ]
  },
  {
    version: "1.3.30",
    changes: [
      "Financing: Loans & Notes list screen with full CRUD at /financing/loans-notes. Sortable 9-column table (Name, Type, Direction, Original Principal, Current Principal, Interest Rate, Payment, Net Worth, Actions). Modal-based Add/Edit with all instrument fields. Subtype filter dropdown. Payable/Receivable direction badges. Net Worth toggle. Soft delete with payment dependency guard. Excludes Contracts for Deed (separate screen). (CM-11)"
    ]
  },
  {
    version: "1.3.29",
    changes: [
      "Dashboard: Buckets card now shows completion % next to each bucket balance, Remaining amount below progress bar, and Next Recommended Allocation line at bottom of card identifying which bucket needs the most funding."
    ]
  },
  {
    version: "1.3.28",
    changes: [
      "Investments: Transaction entry screen at /investments/transactions/:account_id — full CRUD for BUY, SELL, DIVIDEND, REINVEST, and FEE transactions. Dynamic form fields (Quantity/Price for share types, Amount for dividends/fees). SELL displays estimated realized gain preview. Sortable transaction history table with holding filter. Integrates with FIFO cost basis engine: edits and deletes trigger forward recalculation. Accessible from Holdings and Holding Detail via Add Transaction button. (CM-10)"
    ]
  },
  {
    version: "1.3.27",
    changes: [
      "Dashboard: Net Worth card now shows Assets, Liabilities, and Debt Ratio breakdown below the chart. Debt Ratio color-coded: green at 50% or below, red above 100%, neutral in between. Displays em-dash when assets are zero. Updates dynamically on month navigation."
    ]
  },
  {
    version: "1.3.26",
    changes: [
      "Investments: Holdings screen at /investments/accounts/:id — view all holdings for an investment account with sortable columns (Symbol, Description, Shares, Market Price, Market Value, Cost Basis, Unrealized Gain, % Gain/Loss). Click account cards on dashboard to navigate. Click symbol to view holding detail. (CM-9)",
      "Investments: Holding detail screen at /investments/holding/:id — summary metrics (Total Shares, Market Value, Cost Basis, Unrealized Gain/Loss) with 4 tabs: Transactions (full trade history with colored type badges), Performance (placeholder), Dividends (filtered view with reinvestment indicator), and Notes (save to API). (CM-9)"
    ]
  },
  {
    version: "1.3.25",
    changes: [
      "Dashboard: Spending Overview card now shows comparison vs 3-month average (color-coded: red for over, green for under), Daily Average spending, and Projected Month-End spending based on current velocity. Metrics update dynamically on month navigation. Hidden when insufficient history."
    ]
  },
  {
    version: "1.3.24",
    changes: [
      "Investments: Dashboard at /investments — portfolio summary metrics (Total Portfolio Value, Cost Basis, Unrealized Gain/Loss, Realized Gain) with gain/loss color coding, and per-account summary cards showing Market Value, Cost Basis, Unrealized Gain with percentage. (CM-8)",
      "Investments: Account management at /investments/accounts — full CRUD for investment accounts with modal-based add/edit, sortable columns, filter by account type, inline net-worth toggle, and soft deactivation. (CM-8)"
    ]
  },
  {
    version: "1.3.23",
    changes: [
      "Dashboard: Income & Spending card now shows Net Change (Income - Expenses) and Savings Rate (%) between Expenses and Current Balance. Net Change displays with sign (+/-) and color semantics (green positive, red negative). Savings Rate shows as percentage with 1 decimal, or em-dash when Income is zero."
    ]
  },
  {
    version: "1.3.22",
    changes: [
      "Investments: New investment_accounts table — dedicated accounts for Brokerage, IRA, Roth IRA, 401k, 403b, 529 Plan, HSA, SEP IRA, Trust, Other. Account-level include_in_net_worth and active flags control net worth aggregation. (CM-7)",
      "Investments: Added REINVEST and FEE transaction types — REINVEST acts as BUY using dividend amount (creates FIFO lots), FEE records expense without changing share count. (CM-7)",
      "Investments: Cost basis engine (InvestmentTransactionProcessor) — processes BUY/SELL/REINVEST/DIVIDEND/FEE transactions, creates/consumes FIFO lots, calculates realized gains, supports transaction reversal for edits/deletes. (CM-7)",
      "Investments: Updated validations — shares/price nullable for DIVIDEND/FEE, sell-more-than-owned guard, amount required for DIVIDEND/FEE. (CM-7)",
      "Net Worth: Updated to filter investments through investment_accounts (include_in_net_worth + active) with backward compatibility for orphan holdings. (CM-7)"
    ]
  },
  {
    version: "1.3.21",
    changes: [
      "Dashboard: Fixed card height inconsistency — added max-height: 28rem hard ceiling, min-height: 0 on flipper + front flex containers to allow proper flex shrinking, Slot 5 (Recent Activity) scroll containment enforced. All 6 cards now locked at identical 448px height at desktop and iPad widths. (CM-5)",
      "Asset Detail Screen: 4-tab layout at /assets/:id — Overview (2-column: Purchase Date/Price, Current Value, Net Worth pill, Gain/Loss), Valuation History (table with Add/Delete), Notes (free-form textarea), Documents (placeholder scaffold). Inline edit via Edit Asset button. Asset List names now link to detail page. (CM-4)",
      "Assets Module: Database tables for asset_types (14 system defaults + custom per-user) and assets with current_value, include_in_net_worth, and soft delete (Instruction Set 1/4)",
      "Investments Module: Database tables for investment_holdings, investment_transactions, and investment_lots with FIFO cost basis tracking (Instruction Set 1/4)",
      "Financing Module: Database tables for financing_instruments (PAYABLE/RECEIVABLE), financing_payments with allocation tracking, and amortization_schedule_entries (Instruction Set 1/4)",
      "Net Worth: Updated Account.net_worth_for to include Assets, Investment Holdings, and Financing Instruments — formula: (Accounts + Assets + Investments + Receivables) - (Liabilities + Payables) (Instruction Set 1/4)",
      "Feature Store: Added assets, investments, and financing feature blocks in Net Worth category with accounts_basic dependency (Instruction Set 1/4)",
      "Audit Trail: audit_logs table with Auditable concern for Assets, Investments & Financing — tracks CREATE/UPDATE/DELETE/RECALCULATION events with before/after JSON diffs, staff-only viewer at /admin/audit_logs (Instruction Set 2/4)",
      "Performance Guardrails: RecalculationSafetyService wraps recalculations with timing and 5-second warning threshold (Instruction Set 3/4)",
      "Performance Guardrails: Bounded forward-only FIFO recalculation via FifoRecalculationService — only processes affected transactions forward (Instruction Set 3/4)",
      "Performance Guardrails: AmortizationService for in-memory schedule generation, bulk insert, and forward-only recalculation from affected period (Instruction Set 3/4)",
      "Performance Guardrails: Financing term_months capped at 480 months (40 years), investment holdings warn at 5,000+ transactions (Instruction Set 3/4)",
      "Performance Guardrails: Paginatable concern for API controllers with MAX_PER_PAGE=500, SQL-level aggregation via InvestmentHolding.with_computed_values scope (Instruction Set 3/4)",
      "Dashboard Cards: CSS design tokens (--dash-card-h) for locked card height, dash-card/dash-card-footer/dash-card-scroll classes as single source of truth for card layout",
      "Dashboard Cards: Visual regression test for card height equality, icon visibility, baseline alignment, flip/expand interactions",
      "Assets Module: asset_valuations table for valuation history with auto-sync to asset current_value via AssetValuationService (CM-28)",
      "Assets Module: API endpoints for assets CRUD, asset_types CRUD (system + custom), and nested asset_valuations CRUD (CM-28)",
      "Dashboard Cards: Fixed grid row height enforcement — moved dash-grid to @utility for Tailwind v4 responsive variant, added inline CSS for CDN compatibility; all 6 cards now locked at 28rem (448px) across rows",
      "Assets Dashboard: /assets screen with metrics (Total Asset Value, Total Excluded, Asset Count) and Asset Type Breakdown cards (CM-29)",
      "Asset Depreciation Engine: Added depreciation_method (NONE/STRAIGHT_LINE/PERCENTAGE), annual_rate, useful_life_years, projection_enabled fields to assets. Projected values calculated dynamically (display-only, never stored). Depreciation Settings form on Asset Detail Overview tab with 5-year projection summary. (CM-32)",
      "Dashboard Accounts Card: Replaced pie chart backside with Assets vs Liabilities horizontal bar comparison showing totals, percentages, and top-3 breakdown. Front side now groups accounts into Assets/Liabilities sections with section totals. (CM-32)",
      "Asset Detail: Valuation Trend Chart — SVG line chart on Valuation History tab showing chronological value trend with purple accent, gridlines, hover tooltips, dark mode support, single-point display, and responsive sizing (CM-31)",
      "Assets List: /assets/list screen with full CRUD, modal-based add/edit, inline net worth toggle, type filtering, sortable columns (CM-29)",
      "Navigation: Removed redundant Recurring Payments and Recurring Deposits sidebar menu items — accessible via tabs in Payments and Deposits screens",
    ]
  },
  {
    version: "1.3.20",
    changes: [
      "Dashboard Recent Payments: server-side pagination (10 per page) with Load More button, fixed 320px max-height for consistent card heights, expanded mode lifts height cap (CM-6)",
      "Accounting Sign Architecture: Centralized balance operations (apply_payment!, reverse_payment!, apply_transfer_in!, apply_transfer_out!) on Account model — single source of truth for sign-aware math via balance_multiplier (CM-31)",
      "Accounting Sign Architecture: Fixed ImportExecutorService missing balance_multiplier — Smart Import to CREDIT accounts now produces correct balances (CM-31)",
      "Accounting Sign Architecture: Added CREDIT deposit guard in Smart Import — deposits to liability accounts blocked with clear error message (CM-31)",
      "Accounting Sign Architecture: Refactored PaymentsController and TransferMastersController to use centralized Account balance methods, eliminating inline arithmetic duplication (CM-31)",
      "Smart Import: Step 3 rewritten as Q&A cards — groups similar transactions by normalized description, user answers once per group instead of per row (CM-2)",
      "Smart Import: Transfer grouping — transfers auto-detected by account suffix (*2685, *2876 etc.) with direction-aware from/to account assignment (CM-2)",
      "Smart Import: Step 4 rewritten as combined Review table — pre-filled with group answers, supports per-row overrides with filter tabs and pagination (CM-2)",
      "Smart Import: Fixed debit/credit column combining — separate Credit and Debit columns now merge into single amount for banks that split them (CM-2)",
      "Smart Import: Fixed transfer direction — incoming transfers (Transfer from *XXXX) now correctly set from_account_id instead of always using import account as from (CM-2)",
      "Smart Import: Stepper labels updated — Step 3 'Classify' renamed to 'Questions', Step 4 'Assign' renamed to 'Review' (CM-2)",
      "Account Types: Added normal_balance_type field (DEBIT/CREDIT) to classify asset vs liability account types (CM-21)",
      "Account Types: 4 new master types — Personal Loan Receivable, Personal Loan Payable, Contract for Deed Receivable, Contract for Deed Payable (CM-21)",
      "Account Types: Normal Balance pill badges on both Account Type Masters (admin) and Account Types (user) screens (CM-21)",
      "Account Types: Segmented DEBIT/CREDIT control in Add/Edit modals for both admin and custom types (CM-21)",
      "Dashboard: Net Worth now correctly calculates as assets minus liabilities using normal_balance_type (CM-21)",
      "Deposits: Account dropdown restricted to DEBIT-normal (asset) accounts only — server-side validation blocks CREDIT accounts (CM-22)",
      "Payments: Sign-aware balance math — CREDIT account payments increase liability balance instead of decreasing it (CM-22)",
      "Transfers: Sign-aware balance math for all DEBIT/CREDIT account combinations — correct handling of liability payoff, cash advance, and inter-liability transfers (CM-22)",
      "Accounts API: Now includes normal_balance_type in JSON response for client-side filtering (CM-22)",
      "AccountBalanceService: Sign-aware recomputation — reconciliation and dashboard balances correct for liability accounts (CM-22)",
      "Payments dropdown: Liability accounts grouped under 'Liability Accounts' optgroup for clear visual separation (CM-22)",
      "Net Worth: Account.net_worth_for class helper — single source of truth for assets minus liabilities calculation (CM-24)",
      "Accounts screen: Total now shows Net Worth (assets minus liabilities) instead of straight sum (CM-24)",
      "Dashboard Card 2: Pie chart uses absolute balance values; total shows net worth via Account.net_worth_for (CM-24)",
      "Dashboard Card 4: Budget accounts filtered to DEBIT-only — liability accounts excluded from cash position (CM-24)",
      "Month Close: Snapshots use DEBIT-only budget totals and type-based net worth calculation (CM-24)",
      "Net Worth Report: Type-based asset/liability classification replaces sign-based (balance >= 0) logic (CM-24)",
      "Soft Close Summary: Type-based asset/liability classification for net worth section (CM-24)",
      "Net Worth Snapshots: Populate endpoint uses Account.net_worth_for instead of raw sum (CM-24)",
      "Buckets: DEBIT-only constraint — model validation, controller check, and JS dropdown filter block CREDIT accounts (CM-24)",
      "Dashboard Buckets card: Redesigned centered layout — centered title, centered bucket names/balances, progress bars at 65% width, centered 3-column financial metrics grid (CM-25)",
      "Dashboard: Flip icon standardized — all 6 cards now use identical ArrowPath (circular arrows) icon for flip/rotate action (CM-26)",
      "Liability Display Standardization: liability accounts display as negative balance with red text across all surfaces — Accounts table, Dashboard Accounts card, Dashboard Net Worth card, transfer dropdowns (CM-27)",
      "Dashboard Net Worth card: Fixed calculation to use Account.net_worth_for() instead of raw sum(:balance) (CM-27)",
      "Accounts API: New display_balance field in JSON response — applies balance_multiplier for consistent frontend display (CM-27)",
      "Dashboard Accounts card: 'Total' label renamed to 'Net Worth' for clarity (CM-27)",
      "Dashboard expand: Piston open — expanded cards scroll to top automatically, no more scrolled-down landing state (CM-28)",
      "Dashboard expand: Centered layout — expanded card content bounded to 1000px max-width with auto margins (CM-28)",
      "Dashboard: 'Recent Activity' renamed to 'Recent Payments' — title updated in both small and expanded card views (CM-29)",
      "Dashboard Recent Payments: Internal scroll added — card body scrolls when items exceed visible height without expanding card (CM-29)",
      "Dashboard Recent Payments: Row layout improved — descriptions truncate with ellipsis, amounts stay right-aligned with no gap stretching (CM-29)",
    ]
  },
  {
    version: "1.3.19",
    changes: [
      "Smart Import: 5-step wizard for importing bank transactions from CSV, OFX, QFX, and QBO files (CM-1)",
      "Smart Import: Step 1 — Account selection and file upload with drag-and-drop zone, CSV parsed client-side, OFX/QFX/QBO parsed server-side via Nokogiri (CM-1)",
      "Smart Import: Step 2 — Column mapping with auto-detection heuristics and confidence indicators (HIGH/MEDIUM/LOW), date format detection, amount sign convention (CM-1)",
      "Smart Import: Step 3 — Transaction classification (Payment/Deposit/Transfer/Skip) with auto-classify, filter tabs, bulk actions, and pagination (CM-1)",
      "Smart Import: Step 4 — Assignment details per classification — spending categories for payments, source names for deposits, destination accounts for transfers (CM-1)",
      "Smart Import: Step 5 — Confirmation summary with counts, totals, duplicate warnings, progress bar during import, and save-as-template prompt (CM-1)",
      "Smart Import: Baby-step UX — conversational question headers, hover tooltips explaining each step, main-element highlighting, micro-feedback on completion (CM-1)",
      "Smart Import: Saved templates — auto-suggest matching templates by column signature (SHA-256), full template CRUD management (CM-1)",
      "Smart Import: Duplicate detection — SHA-256 hash of date+amount+description compared against existing records within +-3 day window (CM-1)",
      "Smart Import: Import executor creates Payment, IncomeEntry, and TransferMaster records with correct balance adjustments in individual transactions (CM-1)",
      "Database: New import_templates, import_sessions, and import_session_rows tables with jsonb column mapping and classification data (CM-1)",
      "Navigation: Smart Import added to Accounts sidebar group and as button on Payments, Deposits, and Transfers screens (CM-1)",
    ]
  },
  {
    version: "1.3.18",
    changes: [
      "Reports: New Spending by Type report — spending breakdown by Need, Want, Savings/Investment with amounts, percentages, and transaction counts (CM-4)",
      "Reports: Report options popup with Regular and Comparison modes, matching existing report pattern (CM-4)",
      "Reports: Comparison mode shows previous month variance ($, %) and optional YTD totals per spending type (CM-4)",
      "Reports: Print button generates clean, print-optimized report with MyBudgetHQ branding (CM-4)",
      "Reports: Spending by Type registered in reports table and accessible from Monthly > Reports menu (CM-4)",
      "Reports: New Account Balance History report — historical balances by month with snapshot data for closed months and live calculations for open month (CM-5)",
      "Reports: Account Balance History options modal with account selection, date range, table/chart output format, and closed-months-only toggle (CM-5)",
      "Reports: Account Balance History chart view with SVG line chart showing month-over-month ending balances (CM-5)",
      "Reports: Account Balance History print support with MyBudgetHQ branding (CM-5)",
      "Reports: New Income by Source report — deposits grouped by source with amounts, counts, and percentages (CM-6)",
      "Reports: Income by Source options modal with date range, account filter, recurring toggle, and table/chart format (CM-6)",
      "Reports: Income by Source pie chart view with color-coded segments and legend (CM-6)",
      "Reports: Income by Source print support with MyBudgetHQ branding (CM-6)",
      "Reports: New Net Worth Report — historical net worth by month with total assets, total liabilities, and month-over-month change (CM-7)",
      "Reports: Net Worth Report options modal with date range, in-budget accounts toggle, and table/chart format (CM-7)",
      "Reports: Net Worth Report line chart view showing net worth trend over time (CM-7)",
      "Reports: Net Worth Report print support with MyBudgetHQ branding (CM-7)",
      "Reports: New Soft Close Summary report — snapshot data captured during month soft close with account detail, income/spending, and net worth sections (CM-8)",
      "Reports: Soft Close Summary options modal with month selector and section visibility toggles (CM-8)",
      "Reports: Soft Close Summary print support with MyBudgetHQ branding (CM-8)",
      "Reports: New Reconciliation Report — account reconciliation summary with transaction detail, reconciled flags, and balance comparison (CM-9)",
      "Reports: Reconciliation Report options modal with account/month selectors and detail toggles (CM-9)",
      "Reports: Reconciliation Report print support with MyBudgetHQ branding (CM-9)",
      "Payments: New Recurring Payments screen — full CRUD for scheduled payment obligations (CM-10)",
      "Payments: Recurring Payments table with inline add/edit, use toggle, frequency, account, and category columns (CM-10)",
      "Payments: Auto-generation engine — due recurring payments automatically create payment entries when Payments screen loads (CM-10)",
      "Payments: Generated payments linked via payment_recurring_id FK for traceability (CM-10)",
      "Database: New payment_recurrings table with frequency, account, category, and soft-delete support (CM-10)",
      "Navigation: Recurring Payments added under Payments sidebar group (CM-10)",
      "Dashboard: Drag-and-drop cards now grab from anywhere on the card surface — no more tiny handle icon (CM-11)",
      "Dashboard: True two-card swap on drag — only the dragged card and drop target exchange positions, no other cards shift (CM-11)",
      "Dashboard: Touch-friendly drag with delay and threshold to prevent accidental drags on mobile/tablet (CM-11)",
      "Payments: Auto-learn category default tags — saving a payment with tags automatically adds those tags as defaults for the selected category (CM-6)",
      "Payments: Backfill rake task (tags:backfill_category_defaults) derives category defaults from historical tagged payments (CM-6)",
      "Dashboard: Accounts card and Net Worth card now always include ALL active accounts regardless of creation date or budget inclusion flag (CM-3)",
      "Dashboard: Fixed card swap rendering bug — removed opacity and transform from drag/swap CSS that created stacking context conflicts with flip card perspective (CM-4)",
      "Dashboard: Explicit drag artifact cleanup on drop end — removes leftover highlight classes, z-index, and inline styles from all cards (CM-4)",
      "Reports: Monthly Cash Flow report now includes new account starting balances as a one-time income inflow for the month the account was created (CM-1)",
      "Reports: Monthly Cash Flow YTD and comparison modes include new account starting balances in variance calculations (CM-1)",
      "Payments: Create Category inline from Add/Edit Payment modal via child modal — no more broken new-tab behavior (CM-4)",
      "Payments: Child modal auto-selects new category after save and triggers default tag + spending type auto-population (CM-4)",
      "Reports: Tag filtering on Spending by Category, Spending by Type, Monthly Cash Flow, and Income by Source reports — filter transactions by selected tags via options modal (CM-1)",
      "Reports: Applied tags banner displays colored tag pills on report header when tag filter is active (CM-1)",
      "Reports: Shared tag_filter.js module provides reusable tag filter UI, query string builder, and applied tags rendering for all analytical reports (CM-1)",
      "Reports: Print output includes applied tag names when tag filter is active (CM-1)",
      "Models: IncomeEntry now supports tag associations via polymorphic tag_assignments for Income by Source tag filtering (CM-1)",
      "Income: Recurring Deposits converted from inline table-row editing to modal-based Add/Edit CRUD for consistency with Deposits screen (CM-3)",
      "Buckets: New allocation-required containers within accounts — earmark money for specific purposes like Vacation Fund or Emergency Fund (CM-1)",
      "Buckets: Full CRUD management screen with account filter, target progress bars, fund/move money between buckets, and active toggle (CM-1)",
      "Buckets: Default bucket per account catches unassigned funds — first bucket auto-set as default, cannot delete default without reassigning (CM-1)",
      "Buckets: Bucket execution on Payments — checkbox + dropdown to deduct from a specific bucket when making a payment (CM-1)",
      "Buckets: Auto-transfer when bucket execution crosses accounts — if bucket's account differs from payment account, transfer is auto-created (CM-1)",
      "Buckets: Transfer bucket allocation — optional From Bucket and To Bucket dropdowns on transfers, with auto-deposit to default bucket (CM-1)",
      "Buckets: Transaction audit ledger tracks all bucket balance changes with direction, source type, and memo (CM-1)",
      "Database: New buckets and bucket_transactions tables; bucket_id/is_bucket_execution on payments, from_bucket_id/to_bucket_id on transfers (CM-1)",
      "Navigation: Buckets added under Accounts sidebar group (CM-1)",
      "Data: Backfill payment tags from spending category default tags — all existing payments now inherit category auto-tags (CM-2)",
      "Reports: Drag-and-drop card reordering now matches Dashboard — drag from anywhere on card, swap mode, touch-friendly with delay (CM-3)",
      "Reconciliation: Mark as Reconciled now marks all individual transactions (payments, deposits, transfers, adjustments) as reconciled in a single transaction (CM-4)",
      "Reconciliation: Auto-reconcile triggers automatically when difference equals $0.00 — no manual button click required (CM-4)",
      "Reconciliation: Diagnostic Assistant panel appears when difference is not zero — analyzes count mismatches, single-match transactions, duplicates, subset sums, transposition errors, decimal shifts, sign errors, bank fees, and cross-account matches (CM-5)",
      "Payments: Recurring Payments converted from inline table-row editing to modal-based Add/Edit CRUD for consistency with Deposits and Deposit Sources screens (CM-2)",
      "Reports: Reports Menu header made sticky under the global Hello DJ header — stays visible while scrolling report cards, matching Payments screen pattern (CM-6)",
      "Reports: New Spending by Tag report — spending breakdown grouped by tag with colored dots, amounts, percentages, and transaction counts (CM-2)",
      "Reports: Spending by Tag options modal with Regular and Comparison modes including previous month variance and YTD totals (CM-2)",
      "Reports: Spending by Tag includes Untagged category for payments without tags (CM-2)",
      "Reports: Spending by Tag print support with MyBudgetHQ branding (CM-2)",
      "Dashboard: Tag filter dropdown — filter Spending Overview, Income & Spending, and Recent Activity cards by selected tags without affecting account balances or net worth (CM-2)",
      "Dashboard: Tag filter visual indicator with ring highlight when active, multi-select checkboxes, and Clear button (CM-2)",
      "Theme: Accent color presets — 6 curated themes (Purple, Navy, Teal, Charcoal, Deep Green, Burgundy) that change sidebar, buttons, and toggles via CSS variables (CM-7)",
      "Theme: New Theme Settings screen accessible from Profile dropdown — select, preview, and save accent theme with instant client-side preview (CM-7)",
      "Theme: Server-persisted accent_theme_key on users table — theme loads on every page via data-accent-theme attribute on html element (CM-7)",
      "Rebrand: All user-facing text changed from BudgetHQ to MyBudgetHQ — navbar logo, page title, footer, email templates, SMS messages, report print headers, and static pages (CM-7)",
      "Rebrand: Email addresses updated from support@budgethq.app to support@mybudgethq.app (CM-7)",
      "Theme: Toggle ON-state colors changed from hardcoded purple-600 to theme-aware brand-600 across all screens with toggles (CM-7)",
      "Social Security Benefit Planner: UI-only module with FRA/COLA/lifetime calculations accessible from user menu (CM-SS1)",
      "Social Security Benefit Planner: Reworked to match approved mockup — two-card Participants layout, sortable Strategy Summary table, line chart with 3 strategy lines, Recommendation Summary, and iPad-first stacked dropdowns (CM-1)",
      "Admin: Account Type Masters delete modal — replaced generic fallback with user-friendly messaging showing blocking account names, disabled Delete button on error (CM-7)",
      "Buckets: Table columns reordered — Account displayed before Bucket Name for account-first grouping (CM-1)",
      "Buckets: Default sort by Account A-Z then Bucket Name A-Z on initial load and after data refresh (CM-1)",
      "Buckets: All column headers (Account, Name, Balance, Target, Active) are now clickable and sortable with ascending/descending chevron indicators (CM-1)",
      "Social Security Benefit Planner: Multi-age comparison — enter 2+ claiming ages (years + months) to compare side-by-side with monthly benefit, lifetime value, and notes (CM-SS2)",
      "Social Security Benefit Planner: Break-even analysis — pairwise crossover ages computed via month-by-month cumulative simulation with plain-English winner explanations (CM-SS2)",
      "Social Security Benefit Planner: Cumulative benefit line chart dynamically renders one line per compared claim age with color-coded legend (CM-SS2)",
      "Social Security Benefit Planner: Recommendation narrative summarizes optimal strategy and break-even takeaway in 2-3 sentences (CM-SS2)",
      "Dashboard: Spending Overview card expand button added to front side — expand now available on both front and back sides, matching Accounts card pattern (CM-022126-02)",
      "Dashboard: Fixed Spending Overview expand by removing hardcoded pointer-events:none from flipper container — click events now reliably reach expand button (CM-022126-02)",
      "Dashboard: Buckets card groups buckets under Account headers with account totals and left-border nesting for visual hierarchy (CM-022126-03)",
      "Buckets: New Priority column between Bucket Name and Balance — sortable with ascending/descending indicators (CM-022126-04)",
      "Buckets: Account group row banding — alternating subtle background per account group for visual separation (CM-022126-04)",
      "Buckets: Default sort changed to Account ASC then Priority ASC for priority-driven ordering within each account (CM-022126-04)",
      "Admin: Account Type Masters delete fixed — uses soft-delete instead of hard delete to avoid FK constraint on user_account_types (CM-022126-05)",
      "Admin: Account Type Masters delete error messaging — in-use types show specific account names blocking deletion instead of generic error (CM-022126-05)",
      "Transfers: Bucket badge now per-side — FROM shows badge when from_bucket_id set, TO shows badge when to_bucket_id set, both when both (CM-022126-06)",
      "Social Security Benefit Planner: PIA label clarified — now reads 'Benefit at Full Retirement Age (PIA)' with inline FRA reference below the field (CM-022126-08)",
      "Social Security Benefit Planner: Claim age inputs changed from stacked to single-row grid layout — Years and Months on one line with column headers (CM-022126-08)",
      "Admin: Legal Page Maintenance — new CRUD screens for Terms of Service and Privacy Policy sections with table, add/edit modal, active toggle, and delete confirmation (CM-022126-07)",
      "Legal Pages: Public view now renders from database-driven sections instead of monolithic HTML content column (CM-022126-07)",
      "Database: New legal_page_sections table with section_number, title, body, display_order, active flag, and audit tracking (CM-022126-07)",
      "Navigation: Terms Maint. and Privacy Maint. links added under Admin sidebar group (CM-022126-07)",
      "Reports: All 9 report tables now have sortable column headers — click any header to sort ascending/descending with chevron indicators (CM-022126-06)",
      "Reports: Shared report_sort.js utility provides sortTh(), sortData(), and nextSortState() for consistent sort behavior across all reports (CM-022126-06)",
      "Reports: Secondary sort tiebreaker — Recurring Obligations sorts by Name within same Due Date for stable deterministic ordering (CM-022126-06)",
      "Reports: Print output now preserves current column sort order for all reports (CM-022126-06)",
      "Reports: Spending by Tag report converted to shared report_sort.js with sortable headers and default Amount descending sort (CM-022126-06)",
      "Reports: Monthly Cash Flow detail sections refactored to shared report_sort.js with SVG chevron indicators (CM-022126-06)",
      "Social Security Benefit Planner: PIA input removed — benefit amount now entered per claim age row instead of global PIA (CM-022126-08)",
      "Social Security Benefit Planner: Claim ages changed from dropdowns to compact text inputs with validation (Years 0-120, Months 0-11) (CM-022126-08)",
      "Social Security Benefit Planner: Fixed 3-row claim age grid with per-row Benefit $/mo column — Row 1 auto-populates from birthdate (CM-022126-08)",
      "Social Security Benefit Planner: Full Name labels updated to 'Full Name (Optional)' for both You and Spouse panels (CM-022126-08)",
      "Dashboard: Spending Breakdown per-column totals — each column (Category, Spending Type, Tag) now shows its own total row aligned with amounts (CM-022226-05)",
      "Dashboard: Spending Breakdown wider column gutters (gap-6) for cleaner visual separation between columns (CM-022226-05)",
      "Dashboard: Spending Breakdown tighter label-to-amount spacing within each column for more professional layout (CM-022226-05)",
      "Dashboard: Spending Breakdown grand total removed — per-column totals replace the single global total (CM-022226-05)",
      "Dashboard: Responsive grid layout — 3 columns on desktop (1024px+), 2 columns on tablet (768px+), 1 column on phone for iPad/mobile usability (CM-10)",
      "Dashboard: Responsive card padding (p-4 on tablet, p-6 on desktop) and spending chart sizing (w-24/h-24 tablet, w-32/h-32 desktop) for proper fit (CM-10)",
      "Dashboard: Critical CSS updated with md:grid-cols-2 and lg:grid-cols-3 breakpoints to prevent layout flash on Turbo navigation (CM-10)",
      "Dashboard: Spending Breakdown responsive — 3-column layout at xl (1280px+), single-column stacked below for tablet and mobile readability (CM-11)",
      "Dashboard: Removed Filter by Tag button — tag filtering remains available in reports where it provides analytical value (CM-12)",
      "Buckets: Spent YTD now counts only payment transactions — transfers and adjustments no longer inflate spending totals (CM-13)",
      "Buckets: Max Spend/Yr validation — cannot exceed Target amount, enforced on both client modal and server model (CM-13)",
      "Buckets: Table layout restructured — Max Spend/Yr under Target column, Available to be Spent under Balance column, Spent YTD under Priority column (CM-13)",
      "Global Text Scale: Control enabled for all users on every page — A−/A+ buttons in header adjust UI from 80% to 130% in 5% steps with per-user persistence (CM-15)",
      "Global Text Scale: TEXT_SCALE_TEST_MODE feature flag — true shows control in header for all users, false restricts to Settings only (CM-15)",
      "Dashboard: Net Worth chart auto-backfills from closed-month dashboard snapshots — no more 'No history yet' when historical data exists (CM-16)",
      "Dashboard: Net Worth snapshot now created automatically during soft close alongside dashboard_month_snapshot (CM-16)",
      "Dashboard: Net Worth current-month snapshot updates with live account totals on each dashboard load (CM-16)",
      "Dashboard: Buckets card simplified — removed per-account totals, Available, and Max Spend lines from small card view (CM-17)",
      "Dashboard: Buckets card flip — grid icon toggles between simplified overview and detail view showing account totals and Max Spend metrics (CM-17)",
      "Dashboard: Buckets card expand — expand icon matches Spending Overview and Accounts card pattern for full-size view (CM-17)",
      "Dashboard: Net Worth card flip — table icon toggles between line chart and monthly snapshot history with month-over-month changes (CM-18)",
      "Dashboard: Net Worth card expand — expand icon for full-size view, View Accounts link in footer (CM-18)",
      "Dashboard: Income & Spending card flip — cash icon toggles between summary view and recent deposits list for the month (CM-18)",
      "Dashboard: Income & Spending card expand — expand icon for full-size view with Manage Payments and Manage Deposits links (CM-18)",
      "Dashboard: Recent Activity card flip — arrow icon toggles between recent payments and recent deposits for the month (CM-18)",
      "Dashboard: Recent Activity card expand — expand icon for full-size view with View All and View All Deposits links (CM-18)",
      "Dashboard: All 6 cards now have consistent flip and expand icons — standardized interaction pattern across entire dashboard (CM-18)",
      "Auth: Login form disabled Turbo Drive — forces full page reload after sign-in to prevent broken/unstyled dashboard render (CM-19, CM-20)",
      "Auth: Registration form disabled Turbo Drive — ensures correct layout render with sidebar on first load after signup (CM-19, CM-20)",
      "Auth: Password reset form disabled Turbo Drive — ensures correct layout render after password change (CM-19, CM-20)",
      "Dashboard: Card footer divider lines now pinned to exact same distance from bottom edge on all 6 cards — uses mt-auto flex layout instead of fixed mt-4 margin (CM-23)",
      "Dashboard: Flipper container set to flex column layout so front side stretches full card height, enabling consistent footer positioning (CM-23)",
      "Admin: Fixed Account Type Masters delete crash — association delete_all tried to nullify NOT NULL FK instead of deleting; changed to direct query deletion (CM-7, CM-022126-05)",
      "Buckets: Table layout density — removed progress bars, added dedicated Avail. and Spent YTD columns, compressed Priority to narrow integer-only column, reduced cell padding, fixed table layout with explicit column widths (CM-22)",
      "Dashboard: Expanded Buckets card shows detailed layout — per-bucket Current of Target above progress bar, Max Spend/Yr | Spent | Remaining columns aligned right (CM-24)",
      "Dashboard: Expand/collapse adds data-expanded attribute for layout-aware content toggling across all cards (CM-24)",
      "Buckets: Deterministic table layout via colgroup — column widths locked on first render, no layout shift after page load (CM-25)",
      "Buckets: Max Spend/Yr column now a dedicated sortable header between Target and Avail columns (CM-25)",
      "Buckets: Reduced PRI-Bucket column spacing — Bucket column constrained to 150px via colgroup for tighter visual grouping (CM-25)",
      "Security: User Login Audit — every successful login records user identity, IP address, parsed browser/OS/device, session ID, and app version to append-only audit table (CM-24b)",
      "Security: Failed login attempts logged with attempted email, IP, and failure reason via Warden before_failure hook (CM-24b)",
      "Database: New user_login_audits table with indexes on user_id+login_at, ip_address, and login_at for efficient security queries (CM-24b)",
      "Dashboard: Month navigation now prevents navigating before the user's earliest data month — previous-month chevron disabled at earliest allowed month (CM-25)",
      "Dashboard: Server-side month clamping — API rejects requests for months before user's first data, falling back to earliest allowed month (CM-25)",
      "Buckets: Deterministic column widths on first render — all columns have explicit pixel widths via table-fixed, no auto-content sizing or DOM repaint recalculation (CM-25)",
      "Buckets: New Max Spend/Yr column inserted between Target and Avail — dedicated sortable column shows annual spending cap per bucket (CM-25)",
      "Buckets: Reduced PRI-to-Bucket spacing — Priority column narrowed from w-12 to w-9 for tighter visual grouping with Bucket name (CM-25)",
      "Buckets: Fixed deletion of non-default buckets — skip model validations on bucket being soft-deleted, show error messages to user on failure instead of silent fail (CM-26)",
      "Dashboard: Expanded Buckets card layout corrected — Current of Target centered above progress bar, Max Spend/Yr | Spent | Remaining columns on same row as progress bar, no value duplication (CM-27)",
      "Dashboard: Spending Overview backside layout converted from viewport breakpoints to container-width-driven CSS grid — uses auto-fit minmax(280px, 1fr) so columns adapt to actual card width, consistent across iPad and desktop (CM-28)",
      "Buckets: Fixed deletion of non-default buckets when default bucket has validation issues — bypass model validations on both deleted and default bucket during balance transfer (CM-29)",
      "Dashboard: Expanded Buckets card layout rebalanced — progress bars capped at 42% width with fixed grid endpoint, metrics block (Max Spend/Yr, Spent, Remaining) shifted left for centered two-region layout (CM-30)",
    ]
  },
  {
    version: "1.3.17",
    changes: [
      "Spending Categories: Default Tags selector — assign tags that auto-attach to new payments (CM-3)",
      "Spending Categories: Multi-select tag picker with search, pills, and quick-create in Add/Edit modal (CM-3)",
      "Payments: Auto-attach category default tags when selecting a category in Add Payment modal (CM-3)",
      "Payments: Category-change prompt in Edit Payment modal — Apply or Ignore default tags on category switch (CM-3)",
    ]
  },
  {
    version: "1.3.16",
    changes: [
      "Database: New recurring_obligations table for tracking recurring bills and expenses (CM-2)",
      "Reports: New Recurring Obligations report — lists expected obligations for selected month with due dates, frequency, and totals (CM-2)",
      "Reports: Report options popup with include-inactive toggle, matching existing report pattern (CM-2)",
      "Reports: Print button generates clean, print-optimized report with MyBudgetHQ branding (CM-2)",
      "Reports: Recurring Obligations registered in reports table and accessible from Monthly > Reports menu (CM-2)",
    ]
  },
  {
    version: "1.3.15",
    changes: [
      "Payments: Tags system — create, edit, and delete user-defined tags for labeling payments (CM-1)",
      "Payments: Multi-select tag picker in Add/Edit Payment modal with quick-create support (CM-1)",
      "Payments: Tag filter on Payments list — filter by tag with total reflecting filtered results (CM-1)",
      "Payments: Tag badges displayed on payment rows in the description column (CM-1)",
      "Navigation: New Tags maintenance screen under Payments menu with color picker and modal CRUD (CM-1)",
    ]
  },
  {
    version: "1.3.14",
    changes: [
      "Reports: New Spending by Category report — category breakdown with icon, spending type, amount, percentage, and transaction count (CM-16)",
      "Reports: Report options popup with Regular and Comparison modes, matching Monthly Cash Flow pattern (CM-16)",
      "Reports: Comparison mode shows previous month variance ($, %) and optional YTD totals per category (CM-16)",
      "Reports: Print button generates clean, print-optimized report with MyBudgetHQ branding and repeating headers (CM-16)",
      "Reports: Spending by Category registered in reports table and accessible from Monthly > Reports menu (CM-16)",
    ]
  },
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
      "Admin: Reports Maintenance Route Path field converted from free-text to dropdown sourced from REGISTERED_ROUTES constant (CM-13)",
      "Admin: Server-side validation rejects unregistered route paths; legacy/invalid routes shown with warning on edit (CM-13)",
      "Account Types: Full CRUD for custom account types — Add, Edit, and Soft-Delete via modal (CM-15)",
      "Account Types: Custom types appear in Accounts dropdown alongside system types; in-use deletion protection (CM-15)",
      "Database: Added owner_user_id and deleted_at columns to account_type_masters for custom type support (CM-15)",
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
      "Account Reconciliation: Compare MyBudgetHQ balance against external/statement balance with real-time difference",
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
      "Payments Print button generates print-friendly report with MyBudgetHQ header",
      "Template download format selection: CSV or Excel with localStorage persistence",
    ]
  },
  {
    version: "1.1.5",
    changes: [
      "CSV Upload/Import feature on all 9 data screens (admin only)",
      "Download template, upload CSV, validate inline, batch import via API",
      "Payments Print button generates print-friendly report with MyBudgetHQ header",
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
