class CreateInvestmentAccounts < ActiveRecord::Migration[7.1]
  def change
    create_table :investment_accounts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false, limit: 80
      t.string :account_type, null: false, limit: 30, default: "Brokerage"
      t.boolean :include_in_net_worth, null: false, default: true
      t.boolean :active, null: false, default: true
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :investment_accounts, [:user_id, :deleted_at]
    add_index :investment_accounts, [:user_id, :name], unique: true, where: "deleted_at IS NULL", name: "idx_investment_accounts_unique_name"
  end
end
