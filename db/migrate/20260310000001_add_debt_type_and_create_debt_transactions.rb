class AddDebtTypeAndCreateDebtTransactions < ActiveRecord::Migration[7.1]
  def change
    # 1. Add debt_type column to financing_instruments
    add_column :financing_instruments, :debt_type, :string, limit: 40
    add_index :financing_instruments, [:user_id, :debt_type], name: "idx_fin_instr_user_debt_type"

    # 2. Create debt_transactions ledger table
    create_table :debt_transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :financing_instrument, null: false, foreign_key: true
      t.references :financing_payment, foreign_key: true  # optional link back to payment
      t.date       :transaction_date, null: false
      t.string     :transaction_type, limit: 20, null: false  # CREATE, PAYMENT, ADJUSTMENT, INTEREST, FEE
      t.decimal    :amount, precision: 12, scale: 2, null: false  # positive = increases debt, negative = reduces
      t.string     :source_reference, limit: 255
      t.string     :notes, limit: 500
      t.datetime   :deleted_at
      t.timestamps null: false
    end

    add_index :debt_transactions, [:financing_instrument_id, :transaction_date], name: "idx_debt_txn_instrument_date"
    add_index :debt_transactions, [:financing_instrument_id, :deleted_at], name: "idx_debt_txn_instrument_deleted"
    add_index :debt_transactions, [:user_id, :deleted_at], name: "idx_debt_txn_user_deleted"

    # 3. Backfill existing instruments with ledger entries
    reversible do |dir|
      dir.up do
        # Set debt_type = LOAN for all existing instruments
        execute "UPDATE financing_instruments SET debt_type = 'LOAN' WHERE debt_type IS NULL"

        # Create CREATE transactions for each existing instrument
        execute <<~SQL
          INSERT INTO debt_transactions (user_id, financing_instrument_id, transaction_date, transaction_type, amount, source_reference, created_at, updated_at)
          SELECT user_id, id, start_date, 'CREATE', original_principal, 'backfill', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM financing_instruments
          WHERE deleted_at IS NULL
        SQL

        # Create PAYMENT transactions for each existing financing_payment
        execute <<~SQL
          INSERT INTO debt_transactions (user_id, financing_instrument_id, financing_payment_id, transaction_date, transaction_type, amount, source_reference, created_at, updated_at)
          SELECT fp.user_id, fp.financing_instrument_id, fp.id, fp.payment_date, 'PAYMENT',
                 -(COALESCE(fp.principal_amount, 0) + COALESCE(fp.extra_principal_amount, 0)),
                 CONCAT('FinancingPayment#', fp.id),
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM financing_payments fp
          WHERE fp.deleted_at IS NULL
        SQL
      end
    end
  end
end
