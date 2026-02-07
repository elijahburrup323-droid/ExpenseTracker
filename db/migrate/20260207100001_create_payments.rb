class CreatePayments < ActiveRecord::Migration[7.1]
  def change
    create_table :payments do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.references :spending_category, null: false, foreign_key: true
      t.date :payment_date, null: false
      t.string :description, limit: 255, null: false
      t.text :notes
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.integer :sort_order
      t.datetime :deleted_at
      t.timestamps
    end

    add_index :payments, [:user_id, :sort_order]
    add_index :payments, [:user_id, :payment_date]
  end
end
