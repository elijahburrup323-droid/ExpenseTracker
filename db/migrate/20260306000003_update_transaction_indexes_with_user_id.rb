class UpdateTransactionIndexesWithUserId < ActiveRecord::Migration[7.1]
  def change
    # Replace account-only indexes with composite user_id + account + txn_date indexes
    # for better query performance (all queries filter by user_id)
    remove_index :transactions, name: "idx_txns_account_date"
    remove_index :transactions, name: "idx_txns_from_account_date"
    remove_index :transactions, name: "idx_txns_to_account_date"

    add_index :transactions, [:user_id, :account_id, :txn_date],
              name: "idx_txns_user_account_date",
              where: "account_id IS NOT NULL"
    add_index :transactions, [:user_id, :from_account_id, :txn_date],
              name: "idx_txns_user_from_account_date",
              where: "from_account_id IS NOT NULL"
    add_index :transactions, [:user_id, :to_account_id, :txn_date],
              name: "idx_txns_user_to_account_date",
              where: "to_account_id IS NOT NULL"
  end
end
