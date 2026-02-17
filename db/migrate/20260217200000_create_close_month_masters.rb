class CreateCloseMonthMasters < ActiveRecord::Migration[7.1]
  def change
    create_table :close_month_masters do |t|
      t.bigint :user_id, null: false
      t.integer :closed_year, null: false
      t.integer :closed_month, null: false
      t.datetime :closed_at
      t.bigint :closed_by_user_id
      t.text :notes
      t.timestamps
    end

    add_index :close_month_masters, :user_id
    add_index :close_month_masters, [:user_id, :closed_year, :closed_month], unique: true, name: "idx_close_month_uniq"
    add_foreign_key :close_month_masters, :users
  end
end
