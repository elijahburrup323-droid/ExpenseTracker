class CreateAccounts < ActiveRecord::Migration[7.1]
  def change
    create_table :accounts do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account_type, null: false, foreign_key: true

      t.string :name, limit: 80, null: false
      t.string :institution, limit: 120
      t.decimal :balance, precision: 12, scale: 2, default: 0.0, null: false
      t.boolean :include_in_budget, default: true, null: false
      t.string :icon_key, limit: 40
      t.string :color_key, limit: 40
      t.integer :sort_order, default: 0, null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :accounts, [:user_id, :sort_order]
    execute <<-SQL
      CREATE UNIQUE INDEX index_accounts_on_user_id_and_lower_name
      ON accounts (user_id, LOWER(name))
      WHERE deleted_at IS NULL;
    SQL
  end
end
