class CreateAmortizationScheduleEntries < ActiveRecord::Migration[7.1]
  def change
    create_table :amortization_schedule_entries do |t|
      t.references :user,                   null: false, foreign_key: true
      t.references :financing_instrument,   null: false, foreign_key: true
      t.integer :period_number,             null: false
      t.date    :due_date,                  null: false
      t.decimal :payment_amount,            precision: 12, scale: 2, null: false
      t.decimal :principal_amount,          precision: 12, scale: 2, null: false
      t.decimal :interest_amount,           precision: 12, scale: 2, null: false
      t.decimal :extra_principal_amount,    precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :beginning_balance,         precision: 12, scale: 2, null: false
      t.decimal :ending_balance,            precision: 12, scale: 2, null: false
      t.boolean :is_actual,                 default: false, null: false
        # true if matched to a real financing_payment
      t.references :financing_payment,      foreign_key: true
        # links to actual payment if is_actual=true

      t.timestamps null: false
    end

    # No deleted_at — these are regenerated projections, destroyed and recreated on recalc

    add_index :amortization_schedule_entries,
              [:financing_instrument_id, :period_number],
              unique: true,
              name: "idx_amort_entries_instr_period"
    add_index :amortization_schedule_entries,
              [:user_id, :financing_instrument_id],
              name: "idx_amort_entries_user_instr"
  end
end
