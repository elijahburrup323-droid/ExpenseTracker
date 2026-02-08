class CreateIncomeFrequencyMasters < ActiveRecord::Migration[7.1]
  def change
    create_table :income_frequency_masters do |t|
      t.string :name, limit: 80, null: false
      t.string :frequency_type, limit: 40
      t.integer :interval_days
      t.integer :day_of_month
      t.boolean :is_last_day, default: false
      t.integer :weekday
      t.integer :ordinal
      t.integer :sort_order, null: false
      t.boolean :active, default: true

      t.timestamps null: false
    end

    add_index :income_frequency_masters, :sort_order
    add_index :income_frequency_masters, :frequency_type
  end
end
