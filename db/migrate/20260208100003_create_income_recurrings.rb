class CreateIncomeRecurrings < ActiveRecord::Migration[7.1]
  def change
    create_table :income_recurrings do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, limit: 80, null: false
      t.string :description, limit: 255
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.references :account, foreign_key: true
      t.references :frequency_master, null: false, foreign_key: { to_table: :income_frequency_masters }
      t.date :next_date, null: false
      t.boolean :use_flag, default: true
      t.text :notes
      t.integer :sort_order, default: 0
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :income_recurrings, [:user_id, :sort_order]
    add_index :income_recurrings, [:user_id, :next_date]
  end
end
