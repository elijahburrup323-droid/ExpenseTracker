class AddBucketColumnsToPaymentsAndTransfers < ActiveRecord::Migration[7.1]
  def change
    add_reference :payments, :bucket, null: true, foreign_key: true
    add_column :payments, :is_bucket_execution, :boolean, default: false, null: false

    add_reference :transfer_masters, :from_bucket, null: true, foreign_key: { to_table: :buckets }
    add_reference :transfer_masters, :to_bucket, null: true, foreign_key: { to_table: :buckets }
  end
end
