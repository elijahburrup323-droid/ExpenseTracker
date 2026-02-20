class CreateBuckets < ActiveRecord::Migration[7.1]
  def change
    create_table :buckets do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.string :name, limit: 80, null: false
      t.boolean :is_default, default: false, null: false
      t.integer :priority, default: 0, null: false
      t.decimal :target_amount, precision: 12, scale: 2
      t.decimal :current_balance, precision: 12, scale: 2, default: "0.0", null: false
      t.boolean :is_active, default: true, null: false
      t.integer :sort_order, default: 0, null: false
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :buckets, [:user_id, :account_id]
    add_index :buckets, [:user_id, :is_default], where: "deleted_at IS NULL"
  end
end
