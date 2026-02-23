class AddStatementTransferCountToReconciliationRecords < ActiveRecord::Migration[7.1]
  def change
    add_column :reconciliation_records, :statement_transfer_count, :integer, default: 0
  end
end
