class AddReconciledToIncomeEntries < ActiveRecord::Migration[7.1]
  def change
    add_column :income_entries, :reconciled, :boolean, default: false, null: false
  end
end
