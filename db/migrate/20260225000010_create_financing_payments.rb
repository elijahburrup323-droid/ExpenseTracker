class CreateFinancingPayments < ActiveRecord::Migration[7.1]
  def change
    create_table :financing_payments do |t|
      t.references :user,                   null: false, foreign_key: true
      t.references :financing_instrument,   null: false, foreign_key: true
      t.date    :payment_date,              null: false
      t.decimal :total_amount,              precision: 12, scale: 2, null: false
      t.decimal :principal_amount,          precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :interest_amount,           precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :extra_principal_amount,    precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :escrow_amount,             precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :fees_amount,               precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :principal_balance_after,   precision: 12, scale: 2, null: false
        # Balance after this payment applied
      t.integer :payment_number
      t.string  :notes,                     limit: 500
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :financing_payments, [:financing_instrument_id, :payment_date],
              name: "idx_fin_payments_instr_date"
    add_index :financing_payments, [:user_id, :payment_date],
              name: "idx_fin_payments_user_date"
    add_index :financing_payments, [:user_id, :deleted_at],
              name: "idx_fin_payments_user_deleted"
  end
end
