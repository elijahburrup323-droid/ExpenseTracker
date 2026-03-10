class AddCreditCardProfileToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :statement_closing_day, :integer
    add_column :accounts, :payment_due_day, :integer
    add_column :accounts, :minimum_payment, :decimal
    add_column :accounts, :apr, :decimal
    add_column :accounts, :last_statement_balance, :decimal
    add_column :accounts, :last_statement_date, :date
    add_column :accounts, :last_payment_date, :date
  end
end
