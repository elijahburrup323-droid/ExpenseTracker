class AddReconciledToTransferMasters < ActiveRecord::Migration[7.1]
  def change
    add_column :transfer_masters, :reconciled, :boolean, default: false, null: false
  end
end
