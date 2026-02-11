APP_VERSION = "1.0.8"
QA_MODE = true  # Set to true during production QA testing, false after moving to Ready for QA

# Latest version's changes listed first; keep last 5 versions
APP_VERSIONS = [
  {
    version: "1.0.8",
    changes: [
      "QA Mode banner enlarged and sticky on scroll",
      "Release Notes page now matches What's New popup format",
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
]

# Current version's changes (for backward compat)
APP_CHANGELOG = APP_VERSIONS.first[:changes]
