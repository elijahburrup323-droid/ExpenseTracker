class CreateIncomeEntries < ActiveRecord::Migration[7.1]
  def change
    create_table :income_entries do |t|
      t.references :user, null: false, foreign_key: true
      t.references :income_recurring, foreign_key: true
      t.string :source_name, limit: 80, null: false
      t.string :description, limit: 255
      t.date :entry_date, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.references :account, foreign_key: true
      t.references :frequency_master, foreign_key: { to_table: :income_frequency_masters }
      t.boolean :received_flag, default: false
      t.integer :sort_order, default: 0
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :income_entries, [:user_id, :entry_date]
    add_index :income_entries, :received_flag
  end
end
