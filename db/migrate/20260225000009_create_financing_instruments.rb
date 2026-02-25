class CreateFinancingInstruments < ActiveRecord::Migration[7.1]
  def change
    create_table :financing_instruments do |t|
      t.references :user,    null: false, foreign_key: true
      t.references :account, foreign_key: true   # optional link to existing Account
      t.string  :name,                limit: 80,  null: false
      t.string  :description,        limit: 255
      t.string  :instrument_type,    limit: 10,  null: false    # PAYABLE, RECEIVABLE
      t.string  :instrument_subtype, limit: 40
        # MORTGAGE, AUTO_LOAN, STUDENT_LOAN, PERSONAL_LOAN, HELOC,
        # BUSINESS_LOAN, CONTRACT_FOR_DEED, PROMISSORY_NOTE, OTHER
      t.decimal :original_principal, precision: 12, scale: 2, null: false
      t.decimal :current_principal,  precision: 12, scale: 2, null: false
        # Explicitly entered — NOT inferred from payments
      t.decimal :interest_rate,      precision: 7, scale: 4, null: false
        # Annual rate as percentage (e.g. 6.2500 = 6.25%)
      t.integer :term_months,        null: false
      t.date    :start_date,         null: false
      t.date    :maturity_date
      t.string  :payment_frequency,  limit: 20, default: "MONTHLY", null: false
        # MONTHLY, BI_WEEKLY, WEEKLY
      t.decimal :monthly_payment,    precision: 12, scale: 2
      t.string  :lender_or_borrower, limit: 120
        # Who you owe (PAYABLE) or who owes you (RECEIVABLE)
      t.boolean :include_in_net_worth, default: true, null: false
      t.text    :notes
      t.integer :sort_order,         default: 0, null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :financing_instruments, [:user_id, :deleted_at]
    add_index :financing_instruments, [:user_id, :instrument_type],
              name: "idx_fin_instr_user_type"
    # Unique name per user among active instruments
    add_index :financing_instruments, "user_id, lower(name)",
              unique: true,
              name: "idx_fin_instr_user_name_unique",
              where: "deleted_at IS NULL"
  end
end
