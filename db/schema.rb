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

ActiveRecord::Schema[7.1].define(version: 2026_02_08_100005) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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
    t.index "user_id, lower((name)::text)", name: "index_accounts_on_user_id_and_lower_name", unique: true, where: "(deleted_at IS NULL)"
    t.index ["account_type_id"], name: "index_accounts_on_account_type_id"
    t.index ["user_id", "sort_order"], name: "index_accounts_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_accounts_on_user_id"
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
    t.index ["account_id"], name: "index_payments_on_account_id"
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
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["phone_number"], name: "index_users_on_phone_number", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["secondary_email"], name: "index_users_on_secondary_email", unique: true, where: "((secondary_email IS NOT NULL) AND ((secondary_email)::text <> ''::text))"
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true
  end

  add_foreign_key "account_types", "users"
  add_foreign_key "accounts", "account_types"
  add_foreign_key "accounts", "users"
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
  add_foreign_key "payments", "accounts"
  add_foreign_key "payments", "spending_categories"
  add_foreign_key "payments", "spending_types", column: "spending_type_override_id", on_delete: :nullify
  add_foreign_key "payments", "users"
  add_foreign_key "spending_categories", "spending_types"
  add_foreign_key "spending_categories", "users"
  add_foreign_key "spending_types", "users"
end
