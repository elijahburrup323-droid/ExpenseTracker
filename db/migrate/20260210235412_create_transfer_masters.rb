class CreateTransferMasters < ActiveRecord::Migration[7.1]
  def change
    create_table :transfer_masters do |t|
      t.references :user, null: false, foreign_key: true
      t.date :transfer_date, null: false
      t.references :from_account, null: false, foreign_key: { to_table: :accounts }
      t.references :to_account, null: false, foreign_key: { to_table: :accounts }
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.string :memo

      t.timestamps
    end

    add_index :transfer_masters, :transfer_date
  end
end
