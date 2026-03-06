# Legacy Table Freeze Configuration
# Set to true to stop all writes to legacy payments/income_entries/transfer_masters tables.
# When frozen, all writes route through the Transaction Engine into the canonical transactions table.
# Legacy tables remain readable for rollback/audit.
Rails.application.config.legacy_tables_frozen = ENV.fetch("LEGACY_TABLES_FROZEN", "false") == "true"
