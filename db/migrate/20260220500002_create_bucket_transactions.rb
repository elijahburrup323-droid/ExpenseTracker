class CreateBucketTransactions < ActiveRecord::Migration[7.1]
  def change
    create_table :bucket_transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :bucket, null: false, foreign_key: true
      t.date :txn_date, null: false
      t.string :direction, limit: 3, null: false
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.string :source_type, limit: 30, null: false
      t.bigint :source_id
      t.string :memo, limit: 255

      t.datetime :created_at, null: false
    end

    add_index :bucket_transactions, [:bucket_id, :txn_date]
    add_index :bucket_transactions, [:source_type, :source_id]
  end
end
