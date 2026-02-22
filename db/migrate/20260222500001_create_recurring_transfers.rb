class CreateRecurringTransfers < ActiveRecord::Migration[7.1]
  def change
    create_table :recurring_transfers do |t|
      t.references :user, null: false, foreign_key: true
      t.references :from_account, null: false, foreign_key: { to_table: :accounts }
      t.references :to_account, null: false, foreign_key: { to_table: :accounts }
      t.references :from_bucket, null: true, foreign_key: { to_table: :buckets }
      t.references :to_bucket, null: true, foreign_key: { to_table: :buckets }
      t.references :frequency_master, null: false, foreign_key: { to_table: :income_frequency_masters }
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.date :next_date, null: false
      t.boolean :use_flag, default: true, null: false
      t.string :memo, limit: 255
      t.integer :sort_order, default: 0, null: false
      t.datetime :deleted_at
      t.timestamps
    end

    add_index :recurring_transfers, :next_date
    add_index :recurring_transfers, [:user_id, :deleted_at]
  end
end
