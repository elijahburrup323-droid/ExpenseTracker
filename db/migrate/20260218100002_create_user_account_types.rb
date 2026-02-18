class CreateUserAccountTypes < ActiveRecord::Migration[7.1]
  def change
    create_table :user_account_types do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account_type_master, null: false, foreign_key: true
      t.boolean :is_enabled, default: true, null: false

      t.timestamps null: false
    end

    add_index :user_account_types, [:user_id, :account_type_master_id], unique: true, name: "idx_user_account_types_unique"
  end
end
