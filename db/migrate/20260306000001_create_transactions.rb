class CreateTransactions < ActiveRecord::Migration[7.1]
  def change
    create_table :transactions do |t|
      t.references :user,              null: false, foreign_key: true

      # Core fields
      t.date    :txn_date,             null: false
      t.string  :txn_type,  limit: 10, null: false   # payment, deposit, transfer
      t.decimal :amount,               precision: 12, scale: 2, null: false
      t.string  :description,          limit: 255
      t.string  :memo,                 limit: 500

      # Account linkage — payment/deposit use account_id; transfer uses from/to
      t.references :account,           null: true, foreign_key: true
      t.references :from_account,      null: true, foreign_key: { to_table: :accounts }
      t.references :to_account,        null: true, foreign_key: { to_table: :accounts }

      # Classification — required for payments, optional for deposits, null for transfers
      t.references :spending_category, null: true, foreign_key: true
      t.references :spending_type,     null: true, foreign_key: true

      # Reconciliation & import
      t.boolean  :cleared,             default: false, null: false
      t.boolean  :reconciled,          default: false, null: false
      t.string   :imported_source,     limit: 100
      t.string   :import_batch_id,     limit: 100
      t.string   :external_id,         limit: 255

      # Soft delete
      t.datetime :deleted_at

      t.timestamps null: false
    end

    # Primary query indexes
    add_index :transactions, [:user_id, :txn_date],
              name: "idx_txns_user_date"
    add_index :transactions, [:user_id, :txn_type, :txn_date],
              name: "idx_txns_user_type_date"
    add_index :transactions, [:user_id, :deleted_at],
              name: "idx_txns_user_deleted"

    # Dedupe index for imports
    add_index :transactions, [:user_id, :external_id],
              name: "idx_txns_user_external_id",
              unique: true,
              where: "external_id IS NOT NULL AND deleted_at IS NULL"

    # Account-based lookups
    add_index :transactions, [:account_id, :txn_date],
              name: "idx_txns_account_date",
              where: "account_id IS NOT NULL"
    add_index :transactions, [:from_account_id, :txn_date],
              name: "idx_txns_from_account_date",
              where: "from_account_id IS NOT NULL"
    add_index :transactions, [:to_account_id, :txn_date],
              name: "idx_txns_to_account_date",
              where: "to_account_id IS NOT NULL"

    # CHECK constraints enforcing type rules at DB level
    reversible do |dir|
      dir.up do
        execute <<~SQL
          ALTER TABLE transactions
            ADD CONSTRAINT chk_txn_type_values
            CHECK (txn_type IN ('payment', 'deposit', 'transfer'));
        SQL

        # payment: account_id required, category_id required, no from/to accounts
        execute <<~SQL
          ALTER TABLE transactions
            ADD CONSTRAINT chk_payment_rules
            CHECK (
              txn_type != 'payment' OR (
                account_id IS NOT NULL
                AND spending_category_id IS NOT NULL
                AND from_account_id IS NULL
                AND to_account_id IS NULL
              )
            );
        SQL

        # deposit: account_id required, no from/to accounts
        execute <<~SQL
          ALTER TABLE transactions
            ADD CONSTRAINT chk_deposit_rules
            CHECK (
              txn_type != 'deposit' OR (
                account_id IS NOT NULL
                AND from_account_id IS NULL
                AND to_account_id IS NULL
              )
            );
        SQL

        # transfer: from/to accounts required, no account_id, no category
        execute <<~SQL
          ALTER TABLE transactions
            ADD CONSTRAINT chk_transfer_rules
            CHECK (
              txn_type != 'transfer' OR (
                from_account_id IS NOT NULL
                AND to_account_id IS NOT NULL
                AND account_id IS NULL
                AND spending_category_id IS NULL
              )
            );
        SQL
      end

      dir.down do
        execute "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_txn_type_values;"
        execute "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_payment_rules;"
        execute "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_deposit_rules;"
        execute "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transfer_rules;"
      end
    end
  end
end
