class CreateBalanceAdjustments < ActiveRecord::Migration[7.1]
  def change
    create_table :balance_adjustments do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.date :adjustment_date, null: false
      t.string :description, limit: 255, null: false
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.text :notes
      t.boolean :reconciled, default: false, null: false
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :balance_adjustments, [:user_id, :adjustment_date]
  end
end
