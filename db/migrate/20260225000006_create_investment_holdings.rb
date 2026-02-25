class CreateInvestmentHoldings < ActiveRecord::Migration[7.1]
  def change
    create_table :investment_holdings do |t|
      t.references :user,    null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true   # must be investment-type account
      t.string  :ticker_symbol,    limit: 20
      t.string  :security_name,    limit: 120, null: false
      t.string  :security_type,    limit: 40, null: false, default: "STOCK"
        # STOCK, ETF, MUTUAL_FUND, BOND, CRYPTO, CASH, OTHER
      t.decimal :shares_held,      precision: 16, scale: 6, null: false, default: "0.0"
      t.decimal :cost_basis_total, precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :current_price,    precision: 12, scale: 4
      t.datetime :price_as_of
      t.boolean :include_in_net_worth, default: true, null: false
      t.text    :notes
      t.integer :sort_order,       default: 0, null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :investment_holdings, [:user_id, :account_id]
    add_index :investment_holdings, [:user_id, :deleted_at]
    # Unique ticker per account among active holdings
    add_index :investment_holdings, [:account_id, :ticker_symbol],
              unique: true,
              name: "idx_inv_holdings_acct_ticker_unique",
              where: "deleted_at IS NULL AND ticker_symbol IS NOT NULL"
  end
end
