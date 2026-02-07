class AddBeginningBalanceToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :beginning_balance, :decimal, precision: 12, scale: 2, default: 0, null: false
    add_column :accounts, :month_ending_balance, :boolean, default: false, null: false
  end
end
