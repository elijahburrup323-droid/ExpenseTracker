class AddInvestmentAccountIdToInvestmentHoldings < ActiveRecord::Migration[7.1]
  def change
    add_reference :investment_holdings, :investment_account, null: true, foreign_key: true
    add_index :investment_holdings, [:investment_account_id, :deleted_at], name: "idx_holdings_on_inv_account_deleted"
  end
end
