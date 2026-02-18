class AddAccountTypeMasterIdToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_reference :accounts, :account_type_master, null: true, foreign_key: true
  end
end
