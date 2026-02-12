class AddSoftCloseReopenFields < ActiveRecord::Migration[7.1]
  def change
    # Section 1: has_data flag on open_month_masters
    add_column :open_month_masters, :has_data, :boolean, null: false, default: false
    add_column :open_month_masters, :first_data_at, :datetime
    add_column :open_month_masters, :first_data_source, :text

    # Section 4: Reopen tracking fields
    add_column :open_month_masters, :reopen_count, :integer, null: false, default: 0
    add_column :open_month_masters, :last_reopened_at, :datetime
    add_column :open_month_masters, :last_reopened_by_user_id, :bigint

    add_index :open_month_masters, :last_reopened_by_user_id,
              name: "index_open_month_masters_on_last_reopened_by"

    # Section 5: Account month snapshots
    create_table :account_month_snapshots do |t|
      t.bigint :user_id, null: false
      t.integer :year, null: false
      t.integer :month, null: false
      t.bigint :account_id, null: false
      t.decimal :beginning_balance, precision: 12, scale: 2, null: false, default: 0
      t.decimal :ending_balance, precision: 12, scale: 2, null: false, default: 0
      t.boolean :is_stale, null: false, default: false
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end

    add_index :account_month_snapshots, [:user_id, :year, :month, :account_id],
              unique: true, name: "idx_acct_month_snap_unique"
    add_index :account_month_snapshots, [:user_id, :year, :month],
              name: "idx_acct_month_snap_period"
    add_foreign_key :account_month_snapshots, :users
    add_foreign_key :account_month_snapshots, :accounts

    # Section 5: Dashboard month snapshots
    create_table :dashboard_month_snapshots do |t|
      t.bigint :user_id, null: false
      t.integer :year, null: false
      t.integer :month, null: false
      t.decimal :total_spent, precision: 12, scale: 2, null: false, default: 0
      t.decimal :total_income, precision: 12, scale: 2, null: false, default: 0
      t.decimal :beginning_balance, precision: 12, scale: 2, null: false, default: 0
      t.decimal :ending_balance, precision: 12, scale: 2, null: false, default: 0
      t.decimal :net_worth, precision: 12, scale: 2, null: false, default: 0
      t.boolean :is_stale, null: false, default: false
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end

    add_index :dashboard_month_snapshots, [:user_id, :year, :month],
              unique: true, name: "idx_dash_month_snap_unique"
    add_foreign_key :dashboard_month_snapshots, :users
  end
end
