class CreateInvestmentLots < ActiveRecord::Migration[7.1]
  def change
    create_table :investment_lots do |t|
      t.references :user,                    null: false, foreign_key: true
      t.references :investment_holding,      null: false, foreign_key: true
      t.references :buy_transaction,         null: false, foreign_key: { to_table: :investment_transactions }
      t.references :sell_transaction,        foreign_key: { to_table: :investment_transactions }
        # NULL while lot is open; set when partially/fully consumed
      t.date    :acquired_date,     null: false
      t.decimal :shares_acquired,   precision: 16, scale: 6, null: false
      t.decimal :shares_remaining,  precision: 16, scale: 6, null: false
      t.decimal :cost_per_share,    precision: 12, scale: 4, null: false
      t.decimal :cost_basis,        precision: 12, scale: 2, null: false
        # = shares_acquired * cost_per_share (at lot creation)
      t.string  :status,            limit: 10, null: false, default: "OPEN"
        # OPEN, PARTIAL, CLOSED

      t.timestamps null: false
    end

    # No deleted_at — lots are lifecycle-managed by their parent transactions

    add_index :investment_lots, [:investment_holding_id, :acquired_date],
              name: "idx_inv_lots_holding_acquired"
    add_index :investment_lots, [:investment_holding_id, :status],
              name: "idx_inv_lots_holding_status"
    add_index :investment_lots, [:user_id, :status],
              name: "idx_inv_lots_user_status"
  end
end
