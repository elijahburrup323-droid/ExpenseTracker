class AddSyntheticFieldsToTransactions < ActiveRecord::Migration[7.1]
  def change
    add_column :transactions, :is_synthetic, :boolean, default: false, null: false
    add_column :transactions, :synthetic_reason, :string, limit: 50
    add_column :transactions, :source, :string, limit: 50

    add_index :transactions,
              [:user_id, :account_id, :synthetic_reason, :txn_date],
              unique: true,
              where: "is_synthetic = true",
              name: "idx_transactions_synthetic_unique"
  end
end
