class AddRecurringTransferIdToTransferMasters < ActiveRecord::Migration[7.1]
  def change
    add_reference :transfer_masters, :recurring_transfer, null: true, foreign_key: true
  end
end
