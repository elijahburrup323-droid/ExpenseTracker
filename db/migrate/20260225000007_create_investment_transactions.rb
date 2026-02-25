class CreateInvestmentTransactions < ActiveRecord::Migration[7.1]
  def change
    create_table :investment_transactions do |t|
      t.references :user,                null: false, foreign_key: true
      t.references :investment_holding,  null: false, foreign_key: true
      t.string  :transaction_type,  limit: 10, null: false    # BUY, SELL, DIVIDEND, SPLIT
      t.date    :transaction_date,  null: false
      t.decimal :shares,            precision: 16, scale: 6, null: false
      t.decimal :price_per_share,   precision: 12, scale: 4, null: false
      t.decimal :total_amount,      precision: 12, scale: 2, null: false
        # = shares * price_per_share (+ fees for BUY, - fees for SELL)
      t.decimal :fees,              precision: 12, scale: 2, default: "0.0", null: false
      t.decimal :realized_gain,     precision: 12, scale: 2
        # Populated at SELL time only (Governance Rule: realized gain stored at SELL)
      t.string  :notes,             limit: 500
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :investment_transactions, [:investment_holding_id, :transaction_date],
              name: "idx_inv_txns_holding_date"
    add_index :investment_transactions, [:user_id, :transaction_date],
              name: "idx_inv_txns_user_date"
    add_index :investment_transactions, [:user_id, :deleted_at],
              name: "idx_inv_txns_user_deleted"
  end
end
