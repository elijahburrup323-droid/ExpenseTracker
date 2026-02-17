class CreateReconciliationRecords < ActiveRecord::Migration[7.1]
  def change
    create_table :reconciliation_records do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.integer :year, null: false
      t.integer :month, null: false
      t.decimal :outside_balance, precision: 12, scale: 2
      t.integer :statement_payment_count, default: 0
      t.integer :statement_deposit_count, default: 0
      t.integer :statement_adjustment_count, default: 0
      t.datetime :reconciled_at
      t.bigint :reconciled_by
      t.string :status, limit: 20, default: "open"

      t.timestamps
    end

    add_index :reconciliation_records, [:user_id, :account_id, :year, :month],
              unique: true, name: "idx_recon_records_unique"
  end
end
