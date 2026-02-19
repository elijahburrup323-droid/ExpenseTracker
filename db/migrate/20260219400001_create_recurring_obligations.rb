class CreateRecurringObligations < ActiveRecord::Migration[7.1]
  def change
    create_table :recurring_obligations do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, limit: 80, null: false
      t.string :description, limit: 255
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.references :account, foreign_key: true
      t.references :spending_category, foreign_key: true
      t.references :frequency_master, null: false, foreign_key: { to_table: :income_frequency_masters }
      t.integer :due_day
      t.date :start_date, null: false
      t.boolean :use_flag, default: true
      t.text :notes
      t.integer :sort_order, default: 0
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :recurring_obligations, [:user_id, :deleted_at]
    add_index :recurring_obligations, [:user_id, :start_date]
  end
end
