# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_02_20_500003) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "account_month_snapshots", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "year", null: false
    t.integer "month", null: false
    t.bigint "account_id", null: false
    t.decimal "beginning_balance", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "ending_balance", precision: 12, scale: 2, default: "0.0", null: false
    t.boolean "is_stale", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "year", "month", "account_id"], name: "idx_acct_month_snap_unique", unique: true
    t.index ["user_id", "year", "month"], name: "idx_acct_month_snap_period"
  end

  create_table "account_type_masters", force: :cascade do |t|
    t.string "display_name", limit: 80, null: false
    t.string "normalized_key", limit: 80, null: false
    t.string "description", limit: 255
    t.boolean "is_active", default: true, null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "owner_user_id"
    t.datetime "deleted_at"
    t.index ["normalized_key"], name: "idx_atm_system_normalized_key_unique", unique: true, where: "((owner_user_id IS NULL) AND (deleted_at IS NULL))"
    t.index ["owner_user_id", "normalized_key"], name: "idx_atm_user_normalized_key_unique", unique: true, where: "((owner_user_id IS NOT NULL) AND (deleted_at IS NULL))"
    t.index ["owner_user_id"], name: "index_account_type_masters_on_owner_user_id"
    t.index ["sort_order"], name: "index_account_type_masters_on_sort_order"
  end

  create_table "account_types", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255
    t.string "icon_key", limit: 40
    t.string "color_key", limit: 40
    t.integer "sort_order", default: 0, null: false
    t.boolean "is_system", default: false, null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "use_flag", default: true, null: false
    t.index "user_id, lower((name)::text)", name: "index_account_types_on_user_id_and_lower_name", unique: true, where: "(deleted_at IS NULL)"
    t.index ["user_id", "sort_order"], name: "index_account_types_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_account_types_on_user_id"
  end

  create_table "accounts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_type_id", null: false
    t.string "name", limit: 80, null: false
    t.string "institution", limit: 120
    t.decimal "balance", precision: 12, scale: 2, default: "0.0", null: false
    t.boolean "include_in_budget", default: true, null: false
    t.string "icon_key", limit: 40
    t.string "color_key", limit: 40
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "beginning_balance", precision: 12, scale: 2, default: "0.0", null: false
    t.boolean "month_ending_balance", default: false, null: false
    t.bigint "account_type_master_id"
    t.index "user_id, lower((name)::text)", name: "index_accounts_on_user_id_and_lower_name", unique: true, where: "(deleted_at IS NULL)"
    t.index ["account_type_id"], name: "index_accounts_on_account_type_id"
    t.index ["account_type_master_id"], name: "index_accounts_on_account_type_master_id"
    t.index ["user_id", "sort_order"], name: "index_accounts_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_accounts_on_user_id"
  end

  create_table "balance_adjustments", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id", null: false
    t.date "adjustment_date", null: false
    t.string "description", limit: 255, null: false
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.text "notes"
    t.boolean "reconciled", default: false, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_balance_adjustments_on_account_id"
    t.index ["user_id", "adjustment_date"], name: "index_balance_adjustments_on_user_id_and_adjustment_date"
    t.index ["user_id"], name: "index_balance_adjustments_on_user_id"
  end

  create_table "bucket_transactions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "bucket_id", null: false
    t.date "txn_date", null: false
    t.string "direction", limit: 3, null: false
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.string "source_type", limit: 30, null: false
    t.bigint "source_id"
    t.string "memo", limit: 255
    t.datetime "created_at", null: false
    t.index ["bucket_id", "txn_date"], name: "index_bucket_transactions_on_bucket_id_and_txn_date"
    t.index ["bucket_id"], name: "index_bucket_transactions_on_bucket_id"
    t.index ["source_type", "source_id"], name: "index_bucket_transactions_on_source_type_and_source_id"
    t.index ["user_id"], name: "index_bucket_transactions_on_user_id"
  end

  create_table "buckets", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id", null: false
    t.string "name", limit: 80, null: false
    t.boolean "is_default", default: false, null: false
    t.integer "priority", default: 0, null: false
    t.decimal "target_amount", precision: 12, scale: 2
    t.decimal "current_balance", precision: 12, scale: 2, default: "0.0", null: false
    t.boolean "is_active", default: true, null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_buckets_on_account_id"
    t.index ["user_id", "account_id"], name: "index_buckets_on_user_id_and_account_id"
    t.index ["user_id", "is_default"], name: "index_buckets_on_user_id_and_is_default", where: "(deleted_at IS NULL)"
    t.index ["user_id"], name: "index_buckets_on_user_id"
  end

  create_table "bug_reports", force: :cascade do |t|
    t.string "screen_name"
    t.text "description"
    t.date "processed_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "close_month_masters", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "closed_year", null: false
    t.integer "closed_month", null: false
    t.datetime "closed_at"
    t.bigint "closed_by_user_id"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "closed_year", "closed_month"], name: "idx_close_month_uniq", unique: true
    t.index ["user_id"], name: "index_close_month_masters_on_user_id"
  end

  create_table "dashboard_card_account_rule_tags", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "dashboard_card_account_rule_id", null: false
    t.bigint "tag_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["dashboard_card_account_rule_id"], name: "idx_rule_tags_rule_id"
    t.index ["tag_id"], name: "idx_rule_tags_tag_id"
    t.index ["user_id"], name: "index_dashboard_card_account_rule_tags_on_user_id"
  end

  create_table "dashboard_card_account_rules", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "dashboard_card_id", null: false
    t.string "match_mode", limit: 20, default: "all", null: false
    t.boolean "is_enabled", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["dashboard_card_id"], name: "index_dashboard_card_account_rules_on_dashboard_card_id"
    t.index ["user_id", "dashboard_card_id"], name: "idx_card_account_rules_unique", unique: true
    t.index ["user_id"], name: "index_dashboard_card_account_rules_on_user_id"
  end

  create_table "dashboard_cards", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "card_key", limit: 60, null: false
    t.string "title", limit: 120, null: false
    t.string "card_type", limit: 60, null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "card_key"], name: "idx_dashboard_cards_user_card_key", unique: true
    t.index ["user_id"], name: "index_dashboard_cards_on_user_id"
  end

  create_table "dashboard_month_snapshots", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "year", null: false
    t.integer "month", null: false
    t.decimal "total_spent", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "total_income", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "beginning_balance", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "ending_balance", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "net_worth", precision: 12, scale: 2, default: "0.0", null: false
    t.boolean "is_stale", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "year", "month"], name: "idx_dash_month_snap_unique", unique: true
  end

  create_table "dashboard_slots", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "slot_number", null: false
    t.bigint "dashboard_card_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["dashboard_card_id"], name: "index_dashboard_slots_on_dashboard_card_id"
    t.index ["user_id", "slot_number"], name: "idx_dashboard_slots_user_slot", unique: true
    t.index ["user_id"], name: "index_dashboard_slots_on_user_id"
  end

  create_table "dbu_table_catalogs", force: :cascade do |t|
    t.string "table_name", null: false
    t.string "table_description"
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["table_name"], name: "index_dbu_table_catalogs_on_table_name", unique: true
  end

  create_table "identities", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "provider", null: false
    t.string "uid", null: false
    t.string "access_token"
    t.string "refresh_token"
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["provider", "uid"], name: "index_identities_on_provider_and_uid", unique: true
    t.index ["user_id", "provider"], name: "index_identities_on_user_id_and_provider", unique: true
    t.index ["user_id"], name: "index_identities_on_user_id"
  end

  create_table "income_entries", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "income_recurring_id"
    t.string "source_name", limit: 80, null: false
    t.string "description", limit: 255
    t.date "entry_date", null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.bigint "account_id"
    t.bigint "frequency_master_id"
    t.boolean "received_flag", default: false
    t.integer "sort_order", default: 0
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "reconciled", default: false, null: false
    t.index ["account_id"], name: "index_income_entries_on_account_id"
    t.index ["frequency_master_id"], name: "index_income_entries_on_frequency_master_id"
    t.index ["income_recurring_id"], name: "index_income_entries_on_income_recurring_id"
    t.index ["received_flag"], name: "index_income_entries_on_received_flag"
    t.index ["user_id", "entry_date"], name: "index_income_entries_on_user_id_and_entry_date"
    t.index ["user_id"], name: "index_income_entries_on_user_id"
  end

  create_table "income_frequency_masters", force: :cascade do |t|
    t.string "name", limit: 80, null: false
    t.string "frequency_type", limit: 40
    t.integer "interval_days"
    t.integer "day_of_month"
    t.boolean "is_last_day", default: false
    t.integer "weekday"
    t.integer "ordinal"
    t.integer "sort_order", null: false
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["frequency_type"], name: "index_income_frequency_masters_on_frequency_type"
    t.index ["sort_order"], name: "index_income_frequency_masters_on_sort_order"
  end

  create_table "income_recurrings", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.bigint "account_id"
    t.bigint "frequency_master_id", null: false
    t.date "next_date", null: false
    t.boolean "use_flag", default: true
    t.text "notes"
    t.integer "sort_order", default: 0
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_income_recurrings_on_account_id"
    t.index ["frequency_master_id"], name: "index_income_recurrings_on_frequency_master_id"
    t.index ["user_id", "next_date"], name: "index_income_recurrings_on_user_id_and_next_date"
    t.index ["user_id", "sort_order"], name: "index_income_recurrings_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_income_recurrings_on_user_id"
  end

  create_table "income_user_frequencies", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "frequency_master_id", null: false
    t.boolean "use_flag", default: true
    t.integer "sort_order", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["frequency_master_id"], name: "index_income_user_frequencies_on_frequency_master_id"
    t.index ["user_id", "frequency_master_id"], name: "idx_income_user_freq_unique", unique: true
    t.index ["user_id"], name: "index_income_user_frequencies_on_user_id"
  end

  create_table "legal_pages", force: :cascade do |t|
    t.string "slug"
    t.string "title"
    t.text "content"
    t.datetime "published_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_legal_pages_on_slug", unique: true
  end

  create_table "net_worth_snapshots", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.date "snapshot_date", null: false
    t.decimal "amount", precision: 12, scale: 2, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "snapshot_date"], name: "index_net_worth_snapshots_on_user_id_and_snapshot_date", unique: true
    t.index ["user_id"], name: "index_net_worth_snapshots_on_user_id"
  end

  create_table "open_month_masters", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "current_year", null: false
    t.integer "current_month", null: false
    t.boolean "is_closed", default: false, null: false
    t.datetime "locked_at"
    t.bigint "locked_by_user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "has_data", default: false, null: false
    t.datetime "first_data_at"
    t.text "first_data_source"
    t.integer "reopen_count", default: 0, null: false
    t.datetime "last_reopened_at"
    t.bigint "last_reopened_by_user_id"
    t.index ["last_reopened_by_user_id"], name: "index_open_month_masters_on_last_reopened_by"
    t.index ["locked_by_user_id"], name: "index_open_month_masters_on_locked_by_user_id"
    t.index ["user_id", "current_year", "current_month"], name: "idx_open_month_period"
    t.index ["user_id"], name: "idx_open_month_user", unique: true
  end

  create_table "payment_recurrings", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.bigint "account_id", null: false
    t.bigint "spending_category_id", null: false
    t.bigint "frequency_master_id", null: false
    t.date "next_date", null: false
    t.boolean "use_flag", default: true
    t.text "memo"
    t.integer "sort_order", default: 0
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_payment_recurrings_on_account_id"
    t.index ["frequency_master_id"], name: "index_payment_recurrings_on_frequency_master_id"
    t.index ["spending_category_id"], name: "index_payment_recurrings_on_spending_category_id"
    t.index ["user_id", "account_id"], name: "index_payment_recurrings_on_user_id_and_account_id"
    t.index ["user_id", "next_date"], name: "index_payment_recurrings_on_user_id_and_next_date"
    t.index ["user_id", "sort_order"], name: "index_payment_recurrings_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_payment_recurrings_on_user_id"
  end

  create_table "payments", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id", null: false
    t.bigint "spending_category_id", null: false
    t.date "payment_date", null: false
    t.string "description", limit: 255, null: false
    t.text "notes"
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.integer "sort_order"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "spending_type_override_id"
    t.boolean "reconciled", default: false, null: false
    t.bigint "payment_recurring_id"
    t.bigint "bucket_id"
    t.boolean "is_bucket_execution", default: false, null: false
    t.index ["account_id"], name: "index_payments_on_account_id"
    t.index ["bucket_id"], name: "index_payments_on_bucket_id"
    t.index ["payment_recurring_id"], name: "index_payments_on_payment_recurring_id"
    t.index ["spending_category_id"], name: "index_payments_on_spending_category_id"
    t.index ["user_id", "payment_date"], name: "index_payments_on_user_id_and_payment_date"
    t.index ["user_id", "sort_order"], name: "index_payments_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_payments_on_user_id"
  end

  create_table "phone_verifications", force: :cascade do |t|
    t.string "phone_number", null: false
    t.string "code", null: false
    t.datetime "expires_at", null: false
    t.datetime "verified_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["phone_number", "code"], name: "index_phone_verifications_on_phone_number_and_code"
    t.index ["phone_number"], name: "index_phone_verifications_on_phone_number"
  end

  create_table "quotes", force: :cascade do |t|
    t.text "quote_text", null: false
    t.string "quote_author", limit: 120
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["is_active"], name: "index_quotes_on_is_active"
  end

  create_table "reconciliation_group_ui_states", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id", null: false
    t.integer "year", null: false
    t.integer "month", null: false
    t.string "group_type", limit: 20, null: false
    t.boolean "is_collapsed", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_reconciliation_group_ui_states_on_account_id"
    t.index ["user_id", "account_id", "year", "month", "group_type"], name: "idx_recon_group_ui_unique", unique: true
    t.index ["user_id"], name: "index_reconciliation_group_ui_states_on_user_id"
  end

  create_table "reconciliation_records", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id", null: false
    t.integer "year", null: false
    t.integer "month", null: false
    t.decimal "outside_balance", precision: 12, scale: 2
    t.integer "statement_payment_count", default: 0
    t.integer "statement_deposit_count", default: 0
    t.integer "statement_adjustment_count", default: 0
    t.datetime "reconciled_at"
    t.bigint "reconciled_by"
    t.string "status", limit: 20, default: "open"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_reconciliation_records_on_account_id"
    t.index ["user_id", "account_id", "year", "month"], name: "idx_recon_records_unique", unique: true
    t.index ["user_id"], name: "index_reconciliation_records_on_user_id"
  end

  create_table "recurring_obligations", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.bigint "account_id"
    t.bigint "spending_category_id"
    t.bigint "frequency_master_id", null: false
    t.integer "due_day"
    t.date "start_date", null: false
    t.boolean "use_flag", default: true
    t.text "notes"
    t.integer "sort_order", default: 0
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_recurring_obligations_on_account_id"
    t.index ["frequency_master_id"], name: "index_recurring_obligations_on_frequency_master_id"
    t.index ["spending_category_id"], name: "index_recurring_obligations_on_spending_category_id"
    t.index ["user_id", "deleted_at"], name: "index_recurring_obligations_on_user_id_and_deleted_at"
    t.index ["user_id", "start_date"], name: "index_recurring_obligations_on_user_id_and_start_date"
    t.index ["user_id"], name: "index_recurring_obligations_on_user_id"
  end

  create_table "reports_masters", force: :cascade do |t|
    t.string "report_key", limit: 60, null: false
    t.string "title", limit: 120, null: false
    t.string "category", limit: 60, null: false
    t.string "description", limit: 255
    t.string "icon_key", limit: 40
    t.string "accent_style", limit: 40, default: "brand"
    t.string "route_path", limit: 255
    t.boolean "is_active", default: true, null: false
    t.integer "sort_order_default", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["is_active"], name: "index_reports_masters_on_is_active"
    t.index ["report_key"], name: "index_reports_masters_on_report_key", unique: true
    t.index ["sort_order_default"], name: "index_reports_masters_on_sort_order_default"
  end

  create_table "reports_menu_layouts", force: :cascade do |t|
    t.integer "slot_number", null: false
    t.string "report_key", limit: 60, null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["report_key"], name: "index_reports_menu_layouts_on_report_key", unique: true
    t.index ["slot_number"], name: "index_reports_menu_layouts_on_slot_number", unique: true
  end

  create_table "reports_slots_masters", primary_key: "slot_number", id: :serial, force: :cascade do |t|
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
  end

  create_table "spending_categories", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "spending_type_id", null: false
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255, null: false
    t.boolean "is_debt", default: false, null: false
    t.string "icon_key", limit: 40
    t.string "color_key", limit: 40
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "user_id, lower((name)::text)", name: "index_spending_categories_on_user_id_and_lower_name", unique: true, where: "(deleted_at IS NULL)"
    t.index ["spending_type_id"], name: "index_spending_categories_on_spending_type_id"
    t.index ["user_id", "sort_order"], name: "index_spending_categories_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_spending_categories_on_user_id"
  end

  create_table "spending_limits_history", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "scope_type", limit: 20, null: false
    t.bigint "scope_id", null: false
    t.string "limit_mode", limit: 10, null: false
    t.decimal "limit_value", precision: 12, scale: 2, null: false
    t.integer "effective_start_yyyymm", null: false
    t.integer "effective_end_yyyymm"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "scope_type", "scope_id", "effective_start_yyyymm", "effective_end_yyyymm"], name: "idx_spending_limits_lookup"
    t.index ["user_id", "scope_type", "scope_id"], name: "idx_spending_limits_active_unique", unique: true, where: "((deleted_at IS NULL) AND (effective_end_yyyymm IS NULL))"
    t.index ["user_id"], name: "index_spending_limits_history_on_user_id"
  end

  create_table "spending_types", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255
    t.string "icon_key", limit: 40
    t.string "color_key", limit: 40
    t.integer "sort_order", default: 0, null: false
    t.boolean "is_system", default: false, null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "user_id, lower((name)::text)", name: "index_spending_types_on_user_id_and_lower_name", unique: true, where: "(deleted_at IS NULL)"
    t.index ["user_id", "sort_order"], name: "index_spending_types_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_spending_types_on_user_id"
  end

  create_table "tag_assignments", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "tag_id", null: false
    t.string "taggable_type", null: false
    t.bigint "taggable_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["tag_id"], name: "index_tag_assignments_on_tag_id"
    t.index ["taggable_type", "taggable_id", "tag_id"], name: "idx_tag_assignments_unique", unique: true
    t.index ["user_id", "taggable_type", "taggable_id"], name: "idx_tag_assignments_user_taggable"
    t.index ["user_id"], name: "index_tag_assignments_on_user_id"
  end

  create_table "tags", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 80, null: false
    t.string "color_key", limit: 40
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "name"], name: "idx_tags_user_name_active", unique: true, where: "(deleted_at IS NULL)"
    t.index ["user_id"], name: "index_tags_on_user_id"
  end

  create_table "transfer_masters", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.date "transfer_date", null: false
    t.bigint "from_account_id", null: false
    t.bigint "to_account_id", null: false
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.string "memo"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "reconciled", default: false, null: false
    t.bigint "from_bucket_id"
    t.bigint "to_bucket_id"
    t.index ["from_account_id"], name: "index_transfer_masters_on_from_account_id"
    t.index ["from_bucket_id"], name: "index_transfer_masters_on_from_bucket_id"
    t.index ["to_account_id"], name: "index_transfer_masters_on_to_account_id"
    t.index ["to_bucket_id"], name: "index_transfer_masters_on_to_bucket_id"
    t.index ["transfer_date"], name: "index_transfer_masters_on_transfer_date"
    t.index ["user_id"], name: "index_transfer_masters_on_user_id"
  end

  create_table "user_account_types", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_type_master_id", null: false
    t.boolean "is_enabled", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "custom_description", limit: 255
    t.index ["account_type_master_id"], name: "index_user_account_types_on_account_type_master_id"
    t.index ["user_id", "account_type_master_id"], name: "idx_user_account_types_unique", unique: true
    t.index ["user_id"], name: "index_user_account_types_on_user_id"
  end

  create_table "user_emails", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "email", null: false
    t.string "verification_code"
    t.datetime "verification_sent_at"
    t.datetime "verified_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "send_count", default: 0, null: false
    t.datetime "send_count_reset_at"
    t.integer "verification_attempts", default: 0, null: false
    t.datetime "locked_until"
    t.index ["user_id", "email"], name: "index_user_emails_on_user_id_and_email", unique: true
    t.index ["user_id"], name: "index_user_emails_on_user_id"
  end

  create_table "user_phones", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "phone_number", null: false
    t.string "verification_code"
    t.datetime "verification_sent_at"
    t.datetime "verified_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "send_count", default: 0, null: false
    t.datetime "send_count_reset_at"
    t.integer "verification_attempts", default: 0, null: false
    t.datetime "locked_until"
    t.index ["user_id", "phone_number"], name: "index_user_phones_on_user_id_and_phone_number", unique: true
    t.index ["user_id"], name: "index_user_phones_on_user_id"
  end

  create_table "user_report_layouts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.integer "slot_number", null: false
    t.string "report_key", limit: 60, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "report_key"], name: "idx_user_report_layouts_user_key", unique: true
    t.index ["user_id", "slot_number"], name: "idx_user_report_layouts_user_slot", unique: true
    t.index ["user_id"], name: "index_user_report_layouts_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "first_name"
    t.string "last_name"
    t.string "avatar_url"
    t.string "phone_number"
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "confirmation_sent_at"
    t.string "unconfirmed_email"
    t.integer "failed_attempts", default: 0, null: false
    t.string "unlock_token"
    t.datetime "locked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "secondary_email"
    t.boolean "budgethq_agent", default: false, null: false
    t.boolean "two_factor_enabled", default: false, null: false
    t.boolean "subscription_active", default: false, null: false
    t.date "subscription_start_date"
    t.date "subscription_expiration_date"
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["phone_number"], name: "index_users_on_phone_number", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["secondary_email"], name: "index_users_on_secondary_email", unique: true, where: "((secondary_email IS NOT NULL) AND ((secondary_email)::text <> ''::text))"
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true
  end

  add_foreign_key "account_month_snapshots", "accounts"
  add_foreign_key "account_month_snapshots", "users"
  add_foreign_key "account_type_masters", "users", column: "owner_user_id"
  add_foreign_key "account_types", "users"
  add_foreign_key "accounts", "account_type_masters"
  add_foreign_key "accounts", "account_types"
  add_foreign_key "accounts", "users"
  add_foreign_key "balance_adjustments", "accounts"
  add_foreign_key "balance_adjustments", "users"
  add_foreign_key "bucket_transactions", "buckets"
  add_foreign_key "bucket_transactions", "users"
  add_foreign_key "buckets", "accounts"
  add_foreign_key "buckets", "users"
  add_foreign_key "close_month_masters", "users"
  add_foreign_key "dashboard_card_account_rule_tags", "dashboard_card_account_rules"
  add_foreign_key "dashboard_card_account_rule_tags", "tags"
  add_foreign_key "dashboard_card_account_rule_tags", "users"
  add_foreign_key "dashboard_card_account_rules", "dashboard_cards"
  add_foreign_key "dashboard_card_account_rules", "users"
  add_foreign_key "dashboard_cards", "users"
  add_foreign_key "dashboard_month_snapshots", "users"
  add_foreign_key "dashboard_slots", "dashboard_cards"
  add_foreign_key "dashboard_slots", "users"
  add_foreign_key "identities", "users"
  add_foreign_key "income_entries", "accounts"
  add_foreign_key "income_entries", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "income_entries", "income_recurrings"
  add_foreign_key "income_entries", "users"
  add_foreign_key "income_recurrings", "accounts"
  add_foreign_key "income_recurrings", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "income_recurrings", "users"
  add_foreign_key "income_user_frequencies", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "income_user_frequencies", "users"
  add_foreign_key "net_worth_snapshots", "users"
  add_foreign_key "open_month_masters", "users"
  add_foreign_key "open_month_masters", "users", column: "locked_by_user_id"
  add_foreign_key "payment_recurrings", "accounts"
  add_foreign_key "payment_recurrings", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "payment_recurrings", "spending_categories"
  add_foreign_key "payment_recurrings", "users"
  add_foreign_key "payments", "accounts"
  add_foreign_key "payments", "buckets"
  add_foreign_key "payments", "payment_recurrings"
  add_foreign_key "payments", "spending_categories"
  add_foreign_key "payments", "spending_types", column: "spending_type_override_id", on_delete: :nullify
  add_foreign_key "payments", "users"
  add_foreign_key "reconciliation_group_ui_states", "accounts"
  add_foreign_key "reconciliation_group_ui_states", "users"
  add_foreign_key "reconciliation_records", "accounts"
  add_foreign_key "reconciliation_records", "users"
  add_foreign_key "recurring_obligations", "accounts"
  add_foreign_key "recurring_obligations", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "recurring_obligations", "spending_categories"
  add_foreign_key "recurring_obligations", "users"
  add_foreign_key "spending_categories", "spending_types"
  add_foreign_key "spending_categories", "users"
  add_foreign_key "spending_limits_history", "users"
  add_foreign_key "spending_types", "users"
  add_foreign_key "tag_assignments", "tags"
  add_foreign_key "tag_assignments", "users"
  add_foreign_key "tags", "users"
  add_foreign_key "transfer_masters", "accounts", column: "from_account_id"
  add_foreign_key "transfer_masters", "accounts", column: "to_account_id"
  add_foreign_key "transfer_masters", "buckets", column: "from_bucket_id"
  add_foreign_key "transfer_masters", "buckets", column: "to_bucket_id"
  add_foreign_key "transfer_masters", "users"
  add_foreign_key "user_account_types", "account_type_masters"
  add_foreign_key "user_account_types", "users"
  add_foreign_key "user_emails", "users"
  add_foreign_key "user_phones", "users"
  add_foreign_key "user_report_layouts", "users"
end
