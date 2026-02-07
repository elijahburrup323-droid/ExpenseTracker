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

ActiveRecord::Schema[7.1].define(version: 2024_01_01_000005) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["phone_number"], name: "index_users_on_phone_number", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true
  end

  add_foreign_key "identities", "users"
  add_foreign_key "spending_categories", "spending_types"
  add_foreign_key "spending_categories", "users"
  add_foreign_key "spending_types", "users"
end
