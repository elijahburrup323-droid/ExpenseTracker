class AddReconciledToPayments < ActiveRecord::Migration[7.1]
  def change
    add_column :payments, :reconciled, :boolean, default: false, null: false
  end
end
