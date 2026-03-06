class CreateTransactionMigrationMap < ActiveRecord::Migration[7.1]
  def change
    create_table :transaction_migration_map do |t|
      t.references :user,        null: false, foreign_key: true
      t.string     :legacy_table, limit: 20, null: false  # payments, income_entries, transfer_masters
      t.bigint     :legacy_id,   null: false
      t.references :transaction, null: false, foreign_key: true
      t.datetime   :migrated_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
    end

    add_index :transaction_migration_map, [:user_id, :legacy_table, :legacy_id],
              name: "idx_txn_map_unique",
              unique: true
  end
end
