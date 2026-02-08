class CreateIncomeUserFrequencies < ActiveRecord::Migration[7.1]
  def change
    create_table :income_user_frequencies do |t|
      t.references :user, null: false, foreign_key: true
      t.references :frequency_master, null: false, foreign_key: { to_table: :income_frequency_masters }
      t.boolean :use_flag, default: true
      t.integer :sort_order, default: 0

      t.timestamps null: false
    end

    add_index :income_user_frequencies, [:user_id, :frequency_master_id], unique: true, name: "idx_income_user_freq_unique"
  end
end
