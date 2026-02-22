class AddMaxSpendFieldsToBuckets < ActiveRecord::Migration[7.1]
  def change
    add_column :buckets, :max_spend_per_year, :decimal, precision: 12, scale: 2, null: true
    add_column :buckets, :bucket_year_start_month, :integer, default: 1, null: false
  end
end
