class CreatePaymentRecurrings < ActiveRecord::Migration[7.1]
  def change
    create_table :payment_recurrings do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, limit: 80, null: false
      t.string :description, limit: 255
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.references :account, null: false, foreign_key: true
      t.references :spending_category, null: false, foreign_key: true
      t.references :frequency_master, null: false, foreign_key: { to_table: :income_frequency_masters }
      t.date :next_date, null: false
      t.boolean :use_flag, default: true
      t.text :memo
      t.integer :sort_order, default: 0
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :payment_recurrings, [:user_id, :next_date]
    add_index :payment_recurrings, [:user_id, :sort_order]
    add_index :payment_recurrings, [:user_id, :account_id]
  end
end
