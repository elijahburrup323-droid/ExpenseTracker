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

ActiveRecord::Schema[7.1].define(version: 2026_02_27_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_stat_statements"
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
    t.string "normal_balance_type", limit: 6, default: "DEBIT", null: false
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

  create_table "amortization_schedule_entries", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "financing_instrument_id", null: false
    t.integer "period_number", null: false
    t.date "due_date", null: false
    t.decimal "payment_amount", precision: 12, scale: 2, null: false
    t.decimal "principal_amount", precision: 12, scale: 2, null: false
    t.decimal "interest_amount", precision: 12, scale: 2, null: false
    t.decimal "extra_principal_amount", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "beginning_balance", precision: 12, scale: 2, null: false
    t.decimal "ending_balance", precision: 12, scale: 2, null: false
    t.boolean "is_actual", default: false, null: false
    t.bigint "financing_payment_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["financing_instrument_id", "period_number"], name: "idx_amort_entries_instr_period", unique: true
    t.index ["financing_instrument_id"], name: "index_amortization_schedule_entries_on_financing_instrument_id"
    t.index ["financing_payment_id"], name: "index_amortization_schedule_entries_on_financing_payment_id"
    t.index ["user_id", "financing_instrument_id"], name: "idx_amort_entries_user_instr"
    t.index ["user_id"], name: "index_amortization_schedule_entries_on_user_id"
  end

  create_table "asset_lots", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "asset_id", null: false
    t.date "acquired_date", null: false
    t.decimal "quantity", precision: 16, scale: 6, null: false
    t.decimal "price_per_unit", precision: 12, scale: 4, null: false
    t.decimal "total_cost", precision: 12, scale: 2, null: false
    t.string "notes", limit: 500
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["asset_id", "acquired_date"], name: "idx_asset_lots_asset_acquired"
    t.index ["asset_id", "deleted_at"], name: "idx_asset_lots_asset_deleted"
    t.index ["asset_id"], name: "index_asset_lots_on_asset_id"
    t.index ["user_id", "deleted_at"], name: "idx_asset_lots_user_deleted"
    t.index ["user_id"], name: "index_asset_lots_on_user_id"
  end

  create_table "asset_types", force: :cascade do |t|
    t.bigint "user_id"
    t.string "name", limit: 80, null: false
    t.string "normalized_key", limit: 80, null: false
    t.string "description", limit: 255
    t.string "icon_key", limit: 40
    t.boolean "is_active", default: true, null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["normalized_key"], name: "idx_asset_types_system_key_unique", unique: true, where: "((user_id IS NULL) AND (deleted_at IS NULL))"
    t.index ["sort_order"], name: "index_asset_types_on_sort_order"
    t.index ["user_id", "normalized_key"], name: "idx_asset_types_user_key_unique", unique: true, where: "((user_id IS NOT NULL) AND (deleted_at IS NULL))"
    t.index ["user_id"], name: "index_asset_types_on_user_id"
  end

  create_table "asset_valuations", force: :cascade do |t|
    t.bigint "asset_id", null: false
    t.date "valuation_date", null: false
    t.decimal "value", precision: 12, scale: 2, null: false
    t.string "source", limit: 20, default: "manual", null: false
    t.string "notes", limit: 500
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["asset_id", "deleted_at"], name: "index_asset_valuations_on_asset_id_and_deleted_at"
    t.index ["asset_id", "valuation_date"], name: "idx_asset_valuations_asset_date", order: { valuation_date: :desc }
    t.index ["asset_id"], name: "index_asset_valuations_on_asset_id"
  end

  create_table "assets", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "asset_type_id", null: false
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255
    t.decimal "current_value", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "purchase_price", precision: 12, scale: 2
    t.date "purchase_date"
    t.boolean "include_in_net_worth", default: true, null: false
    t.string "notes", limit: 1000
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "depreciation_method", default: "NONE", null: false
    t.decimal "annual_rate", precision: 8, scale: 4
    t.integer "useful_life_years"
    t.boolean "projection_enabled", default: false, null: false
    t.decimal "total_quantity", precision: 16, scale: 6
    t.decimal "total_cost_basis", precision: 12, scale: 2
    t.decimal "current_price_per_unit", precision: 12, scale: 4
    t.string "unit_label", limit: 20
    t.index "user_id, lower((name)::text)", name: "idx_assets_user_name_unique", unique: true, where: "(deleted_at IS NULL)"
    t.index ["asset_type_id"], name: "index_assets_on_asset_type_id"
    t.index ["user_id", "asset_type_id"], name: "index_assets_on_user_id_and_asset_type_id"
    t.index ["user_id", "deleted_at"], name: "index_assets_on_user_id_and_deleted_at"
    t.index ["user_id"], name: "index_assets_on_user_id"
  end

  create_table "audit_logs", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "entity_type", limit: 60, null: false
    t.bigint "entity_id", null: false
    t.string "action_type", limit: 30, null: false
    t.jsonb "before_json", default: {}
    t.jsonb "after_json", default: {}
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.index ["created_at"], name: "idx_audit_logs_created_at"
    t.index ["entity_type", "entity_id"], name: "idx_audit_logs_entity"
    t.index ["entity_type"], name: "idx_audit_logs_entity_type"
    t.index ["user_id"], name: "idx_audit_logs_user_id"
    t.index ["user_id"], name: "index_audit_logs_on_user_id"
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
    t.decimal "max_spend_per_year", precision: 12, scale: 2
    t.integer "bucket_year_start_month", default: 1, null: false
    t.index ["account_id", "priority"], name: "idx_buckets_unique_priority_zero_per_account", unique: true, where: "((priority = 0) AND (deleted_at IS NULL))"
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

  create_table "feature_block_dependencies", force: :cascade do |t|
    t.bigint "feature_block_id", null: false
    t.bigint "depends_on_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["depends_on_id"], name: "index_feature_block_dependencies_on_depends_on_id"
    t.index ["feature_block_id", "depends_on_id"], name: "idx_feature_block_deps_unique", unique: true
    t.index ["feature_block_id"], name: "index_feature_block_dependencies_on_feature_block_id"
  end

  create_table "feature_blocks", force: :cascade do |t|
    t.string "key", null: false
    t.string "display_name", null: false
    t.string "tagline"
    t.text "description"
    t.string "icon"
    t.string "category"
    t.string "tier", default: "free", null: false
    t.integer "sort_order", default: 0
    t.boolean "is_core", default: false
    t.jsonb "tutorial_data", default: {}
    t.string "estimated_setup"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "activate_path"
    t.index ["key"], name: "index_feature_blocks_on_key", unique: true
  end

  create_table "financing_instruments", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id"
    t.string "name", limit: 80, null: false
    t.string "description", limit: 255
    t.string "instrument_type", limit: 10, null: false
    t.string "instrument_subtype", limit: 40
    t.decimal "original_principal", precision: 12, scale: 2, null: false
    t.decimal "current_principal", precision: 12, scale: 2, null: false
    t.decimal "interest_rate", precision: 7, scale: 4, null: false
    t.integer "term_months", null: false
    t.date "start_date", null: false
    t.date "maturity_date"
    t.string "payment_frequency", limit: 20, default: "MONTHLY", null: false
    t.decimal "monthly_payment", precision: 12, scale: 2
    t.string "lender_or_borrower", limit: 120
    t.boolean "include_in_net_worth", default: true, null: false
    t.text "notes"
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "user_id, lower((name)::text)", name: "idx_fin_instr_user_name_unique", unique: true, where: "(deleted_at IS NULL)"
    t.index ["account_id"], name: "index_financing_instruments_on_account_id"
    t.index ["user_id", "deleted_at"], name: "index_financing_instruments_on_user_id_and_deleted_at"
    t.index ["user_id", "instrument_type"], name: "idx_fin_instr_user_type"
    t.index ["user_id"], name: "index_financing_instruments_on_user_id"
  end

  create_table "financing_payments", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "financing_instrument_id", null: false
    t.date "payment_date", null: false
    t.decimal "total_amount", precision: 12, scale: 2, null: false
    t.decimal "principal_amount", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "interest_amount", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "extra_principal_amount", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "escrow_amount", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "fees_amount", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "principal_balance_after", precision: 12, scale: 2, null: false
    t.integer "payment_number"
    t.string "notes", limit: 500
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["financing_instrument_id", "payment_date"], name: "idx_fin_payments_instr_date"
    t.index ["financing_instrument_id"], name: "index_financing_payments_on_financing_instrument_id"
    t.index ["user_id", "deleted_at"], name: "idx_fin_payments_user_deleted"
    t.index ["user_id", "payment_date"], name: "idx_fin_payments_user_date"
    t.index ["user_id"], name: "index_financing_payments_on_user_id"
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

  create_table "import_session_rows", force: :cascade do |t|
    t.bigint "import_session_id", null: false
    t.integer "row_number", null: false
    t.jsonb "raw_data", default: {}
    t.jsonb "mapped_data", default: {}
    t.string "classification", limit: 20
    t.jsonb "assigned_data", default: {}
    t.string "status", limit: 20, default: "pending", null: false
    t.string "error_message", limit: 500
    t.string "duplicate_key", limit: 128
    t.string "created_record_type", limit: 40
    t.bigint "created_record_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["import_session_id", "classification"], name: "idx_isr_session_class"
    t.index ["import_session_id", "duplicate_key"], name: "idx_isr_duplicate_key"
    t.index ["import_session_id", "row_number"], name: "idx_isr_session_row", unique: true
    t.index ["import_session_id", "status"], name: "idx_isr_session_status"
    t.index ["import_session_id"], name: "index_import_session_rows_on_import_session_id"
  end

  create_table "import_sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "import_template_id"
    t.bigint "account_id", null: false
    t.string "file_name", limit: 255, null: false
    t.string "file_type", limit: 10, null: false
    t.string "status", limit: 20, default: "parsing", null: false
    t.integer "row_count", default: 0, null: false
    t.integer "imported_count", default: 0, null: false
    t.integer "skipped_count", default: 0, null: false
    t.integer "duplicate_count", default: 0, null: false
    t.integer "error_count", default: 0, null: false
    t.jsonb "column_mapping", default: {}
    t.string "detected_date_format", limit: 20
    t.string "detected_amount_convention", limit: 20
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_import_sessions_on_account_id"
    t.index ["import_template_id"], name: "index_import_sessions_on_import_template_id"
    t.index ["user_id", "status"], name: "idx_import_sessions_user_status"
    t.index ["user_id"], name: "index_import_sessions_on_user_id"
  end

  create_table "import_templates", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 120, null: false
    t.string "file_type", limit: 10, null: false
    t.string "column_signature", limit: 64
    t.jsonb "column_mapping", default: {}
    t.jsonb "classification_rules", default: {}
    t.jsonb "assignment_defaults", default: {}
    t.bigint "default_account_id"
    t.string "amount_sign_convention", limit: 20, default: "negative_expense"
    t.string "date_format", limit: 20
    t.integer "use_count", default: 0, null: false
    t.datetime "last_used_at"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["default_account_id"], name: "index_import_templates_on_default_account_id"
    t.index ["user_id", "column_signature"], name: "idx_import_templates_user_sig", where: "(deleted_at IS NULL)"
    t.index ["user_id", "name"], name: "idx_import_templates_user_name", unique: true, where: "(deleted_at IS NULL)"
    t.index ["user_id"], name: "index_import_templates_on_user_id"
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

  create_table "investment_accounts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 80, null: false
    t.string "account_type", limit: 30, default: "Brokerage", null: false
    t.boolean "include_in_net_worth", default: true, null: false
    t.boolean "active", default: true, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "deleted_at"], name: "index_investment_accounts_on_user_id_and_deleted_at"
    t.index ["user_id", "name"], name: "idx_investment_accounts_unique_name", unique: true, where: "(deleted_at IS NULL)"
    t.index ["user_id"], name: "index_investment_accounts_on_user_id"
  end

  create_table "investment_holdings", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "account_id", null: false
    t.string "ticker_symbol", limit: 20
    t.string "security_name", limit: 120, null: false
    t.string "security_type", limit: 40, default: "STOCK", null: false
    t.decimal "shares_held", precision: 16, scale: 6, default: "0.0", null: false
    t.decimal "cost_basis_total", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "current_price", precision: 12, scale: 4
    t.datetime "price_as_of"
    t.boolean "include_in_net_worth", default: true, null: false
    t.text "notes"
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "investment_account_id"
    t.index ["account_id", "ticker_symbol"], name: "idx_inv_holdings_acct_ticker_unique", unique: true, where: "((deleted_at IS NULL) AND (ticker_symbol IS NOT NULL))"
    t.index ["account_id"], name: "index_investment_holdings_on_account_id"
    t.index ["investment_account_id", "deleted_at"], name: "idx_holdings_on_inv_account_deleted"
    t.index ["investment_account_id"], name: "index_investment_holdings_on_investment_account_id"
    t.index ["user_id", "account_id"], name: "index_investment_holdings_on_user_id_and_account_id"
    t.index ["user_id", "deleted_at"], name: "index_investment_holdings_on_user_id_and_deleted_at"
    t.index ["user_id"], name: "index_investment_holdings_on_user_id"
  end

  create_table "investment_lots", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "investment_holding_id", null: false
    t.bigint "buy_transaction_id", null: false
    t.bigint "sell_transaction_id"
    t.date "acquired_date", null: false
    t.decimal "shares_acquired", precision: 16, scale: 6, null: false
    t.decimal "shares_remaining", precision: 16, scale: 6, null: false
    t.decimal "cost_per_share", precision: 12, scale: 4, null: false
    t.decimal "cost_basis", precision: 12, scale: 2, null: false
    t.string "status", limit: 10, default: "OPEN", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["buy_transaction_id"], name: "index_investment_lots_on_buy_transaction_id"
    t.index ["investment_holding_id", "acquired_date"], name: "idx_inv_lots_holding_acquired"
    t.index ["investment_holding_id", "status"], name: "idx_inv_lots_holding_status"
    t.index ["investment_holding_id"], name: "index_investment_lots_on_investment_holding_id"
    t.index ["sell_transaction_id"], name: "index_investment_lots_on_sell_transaction_id"
    t.index ["user_id", "status"], name: "idx_inv_lots_user_status"
    t.index ["user_id"], name: "index_investment_lots_on_user_id"
  end

  create_table "investment_transactions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "investment_holding_id", null: false
    t.string "transaction_type", limit: 10, null: false
    t.date "transaction_date", null: false
    t.decimal "shares", precision: 16, scale: 6
    t.decimal "price_per_share", precision: 12, scale: 4
    t.decimal "total_amount", precision: 12, scale: 2, null: false
    t.decimal "fees", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "realized_gain", precision: 12, scale: 2
    t.string "notes", limit: 500
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["investment_holding_id", "transaction_date"], name: "idx_inv_txns_holding_date"
    t.index ["investment_holding_id"], name: "index_investment_transactions_on_investment_holding_id"
    t.index ["user_id", "deleted_at"], name: "idx_inv_txns_user_deleted"
    t.index ["user_id", "transaction_date"], name: "idx_inv_txns_user_date"
    t.index ["user_id"], name: "index_investment_transactions_on_user_id"
  end

  create_table "legal_page_sections", force: :cascade do |t|
    t.bigint "legal_page_id", null: false
    t.integer "section_number", null: false
    t.string "section_title", null: false
    t.text "section_body", null: false
    t.integer "display_order", default: 0, null: false
    t.boolean "is_active", default: true, null: false
    t.bigint "updated_by"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["legal_page_id", "display_order"], name: "idx_legal_sections_page_order"
    t.index ["legal_page_id"], name: "index_legal_page_sections_on_legal_page_id"
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
    t.integer "statement_transfer_count", default: 0
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

  create_table "recurring_transfers", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "from_account_id", null: false
    t.bigint "to_account_id", null: false
    t.bigint "from_bucket_id"
    t.bigint "to_bucket_id"
    t.bigint "frequency_master_id", null: false
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.date "next_date", null: false
    t.boolean "use_flag", default: true, null: false
    t.string "memo", limit: 255
    t.integer "sort_order", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["frequency_master_id"], name: "index_recurring_transfers_on_frequency_master_id"
    t.index ["from_account_id"], name: "index_recurring_transfers_on_from_account_id"
    t.index ["from_bucket_id"], name: "index_recurring_transfers_on_from_bucket_id"
    t.index ["next_date"], name: "index_recurring_transfers_on_next_date"
    t.index ["to_account_id"], name: "index_recurring_transfers_on_to_account_id"
    t.index ["to_bucket_id"], name: "index_recurring_transfers_on_to_bucket_id"
    t.index ["user_id", "deleted_at"], name: "index_recurring_transfers_on_user_id_and_deleted_at"
    t.index ["user_id"], name: "index_recurring_transfers_on_user_id"
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

  create_table "smart_suggestions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "feature_block_id", null: false
    t.string "rule_key", null: false
    t.string "reason_text"
    t.integer "priority", default: 50
    t.string "status", default: "pending"
    t.datetime "dismissed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["feature_block_id"], name: "index_smart_suggestions_on_feature_block_id"
    t.index ["user_id", "status"], name: "index_smart_suggestions_on_user_id_and_status"
    t.index ["user_id"], name: "index_smart_suggestions_on_user_id"
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
    t.bigint "recurring_transfer_id"
    t.index ["from_account_id"], name: "index_transfer_masters_on_from_account_id"
    t.index ["from_bucket_id"], name: "index_transfer_masters_on_from_bucket_id"
    t.index ["recurring_transfer_id"], name: "index_transfer_masters_on_recurring_transfer_id"
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
    t.string "normal_balance_type", limit: 6, default: "DEBIT", null: false
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

  create_table "user_feature_activations", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "feature_block_id", null: false
    t.datetime "activated_at"
    t.datetime "deactivated_at"
    t.datetime "tutorial_completed_at"
    t.datetime "tutorial_skipped_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["feature_block_id"], name: "index_user_feature_activations_on_feature_block_id"
    t.index ["user_id", "feature_block_id"], name: "idx_user_feature_activations_unique", unique: true
    t.index ["user_id"], name: "index_user_feature_activations_on_user_id"
  end

  create_table "user_login_audits", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "user_email", null: false
    t.string "role", default: "customer", null: false
    t.string "login_method", default: "password", null: false
    t.string "session_id"
    t.string "ip_address"
    t.string "geo_city"
    t.string "geo_region"
    t.string "geo_country"
    t.text "user_agent_raw"
    t.string "browser_name"
    t.string "browser_version"
    t.string "os_name"
    t.string "os_version"
    t.string "device_type"
    t.string "client_timezone"
    t.string "client_locale"
    t.string "request_id"
    t.string "app_version"
    t.string "referrer"
    t.boolean "success", default: true, null: false
    t.string "failure_reason"
    t.datetime "login_at", null: false
    t.index ["ip_address"], name: "index_user_login_audits_on_ip_address"
    t.index ["login_at"], name: "index_user_login_audits_on_login_at"
    t.index ["user_id", "login_at"], name: "index_user_login_audits_on_user_id_and_login_at"
    t.index ["user_id"], name: "index_user_login_audits_on_user_id"
  end

  create_table "user_onboarding_profiles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "persona"
    t.integer "wizard_step"
    t.datetime "wizard_completed_at"
    t.bigint "first_account_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["first_account_id"], name: "index_user_onboarding_profiles_on_first_account_id"
    t.index ["user_id"], name: "index_user_onboarding_profiles_on_user_id", unique: true
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

  create_table "user_tutorial_progress", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "feature_block_id", null: false
    t.integer "current_step", default: 0
    t.integer "total_steps", default: 0
    t.string "status", default: "pending"
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["feature_block_id"], name: "index_user_tutorial_progress_on_feature_block_id"
    t.index ["user_id", "feature_block_id"], name: "idx_user_tutorial_progress_unique", unique: true
    t.index ["user_id"], name: "index_user_tutorial_progress_on_user_id"
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
    t.string "accent_theme_key", limit: 20, default: "purple", null: false
    t.text "sidebar_state_json"
    t.integer "text_scale_percent", default: 100, null: false
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
  add_foreign_key "amortization_schedule_entries", "financing_instruments"
  add_foreign_key "amortization_schedule_entries", "financing_payments"
  add_foreign_key "amortization_schedule_entries", "users"
  add_foreign_key "asset_lots", "assets"
  add_foreign_key "asset_lots", "users"
  add_foreign_key "asset_types", "users"
  add_foreign_key "asset_valuations", "assets"
  add_foreign_key "assets", "asset_types"
  add_foreign_key "assets", "users"
  add_foreign_key "audit_logs", "users"
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
  add_foreign_key "feature_block_dependencies", "feature_blocks"
  add_foreign_key "feature_block_dependencies", "feature_blocks", column: "depends_on_id"
  add_foreign_key "financing_instruments", "accounts"
  add_foreign_key "financing_instruments", "users"
  add_foreign_key "financing_payments", "financing_instruments"
  add_foreign_key "financing_payments", "users"
  add_foreign_key "identities", "users"
  add_foreign_key "import_session_rows", "import_sessions"
  add_foreign_key "import_sessions", "accounts"
  add_foreign_key "import_sessions", "import_templates"
  add_foreign_key "import_sessions", "users"
  add_foreign_key "import_templates", "accounts", column: "default_account_id"
  add_foreign_key "import_templates", "users"
  add_foreign_key "income_entries", "accounts"
  add_foreign_key "income_entries", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "income_entries", "income_recurrings"
  add_foreign_key "income_entries", "users"
  add_foreign_key "income_recurrings", "accounts"
  add_foreign_key "income_recurrings", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "income_recurrings", "users"
  add_foreign_key "income_user_frequencies", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "income_user_frequencies", "users"
  add_foreign_key "investment_accounts", "users"
  add_foreign_key "investment_holdings", "accounts"
  add_foreign_key "investment_holdings", "investment_accounts"
  add_foreign_key "investment_holdings", "users"
  add_foreign_key "investment_lots", "investment_holdings"
  add_foreign_key "investment_lots", "investment_transactions", column: "buy_transaction_id"
  add_foreign_key "investment_lots", "investment_transactions", column: "sell_transaction_id"
  add_foreign_key "investment_lots", "users"
  add_foreign_key "investment_transactions", "investment_holdings"
  add_foreign_key "investment_transactions", "users"
  add_foreign_key "legal_page_sections", "legal_pages"
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
  add_foreign_key "recurring_transfers", "accounts", column: "from_account_id"
  add_foreign_key "recurring_transfers", "accounts", column: "to_account_id"
  add_foreign_key "recurring_transfers", "buckets", column: "from_bucket_id"
  add_foreign_key "recurring_transfers", "buckets", column: "to_bucket_id"
  add_foreign_key "recurring_transfers", "income_frequency_masters", column: "frequency_master_id"
  add_foreign_key "recurring_transfers", "users"
  add_foreign_key "smart_suggestions", "feature_blocks"
  add_foreign_key "smart_suggestions", "users"
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
  add_foreign_key "transfer_masters", "recurring_transfers"
  add_foreign_key "transfer_masters", "users"
  add_foreign_key "user_account_types", "account_type_masters"
  add_foreign_key "user_account_types", "users"
  add_foreign_key "user_emails", "users"
  add_foreign_key "user_feature_activations", "feature_blocks"
  add_foreign_key "user_feature_activations", "users"
  add_foreign_key "user_login_audits", "users"
  add_foreign_key "user_onboarding_profiles", "accounts", column: "first_account_id"
  add_foreign_key "user_onboarding_profiles", "users"
  add_foreign_key "user_phones", "users"
  add_foreign_key "user_report_layouts", "users"
  add_foreign_key "user_tutorial_progress", "feature_blocks"
  add_foreign_key "user_tutorial_progress", "users"
end
