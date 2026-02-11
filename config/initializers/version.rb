APP_VERSION = "1.0.5"

# Latest version's changes listed first; keep last 5 versions
APP_VERSIONS = [
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
      "Card 2 pie chart shows account name, balance, and percentage",
      "Payment list scrolls to top after adding a new payment",
      "Account balances sync with server after payment add/edit/delete",
    ]
  },
]

# Current version's changes (for backward compat)
APP_CHANGELOG = APP_VERSIONS.first[:changes]
