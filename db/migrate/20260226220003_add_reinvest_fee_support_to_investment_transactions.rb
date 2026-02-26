class AddReinvestFeeSupportToInvestmentTransactions < ActiveRecord::Migration[7.1]
  def change
    # DIVIDEND and FEE transactions have no shares or price — allow nulls
    change_column_null :investment_transactions, :shares, true
    change_column_null :investment_transactions, :price_per_share, true
  end
end
