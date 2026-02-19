class AddCustomTypeSupportToAccountTypeMasters < ActiveRecord::Migration[7.1]
  def change
    add_reference :account_type_masters, :owner_user, null: true, foreign_key: { to_table: :users }
    add_column :account_type_masters, :deleted_at, :datetime, null: true

    # Replace the old global unique index on normalized_key
    remove_index :account_type_masters, :normalized_key

    # System types: globally unique normalized_key (owner_user_id IS NULL)
    add_index :account_type_masters, :normalized_key,
      unique: true,
      where: "owner_user_id IS NULL AND deleted_at IS NULL",
      name: "idx_atm_system_normalized_key_unique"

    # Custom types: unique per user
    add_index :account_type_masters, [:owner_user_id, :normalized_key],
      unique: true,
      where: "owner_user_id IS NOT NULL AND deleted_at IS NULL",
      name: "idx_atm_user_normalized_key_unique"
  end
end
