class CreateImportSessionRows < ActiveRecord::Migration[7.1]
  def change
    create_table :import_session_rows do |t|
      t.references :import_session, null: false, foreign_key: true
      t.integer :row_number, null: false
      t.jsonb :raw_data, default: {}                          # original parsed columns
      t.jsonb :mapped_data, default: {}                       # { date:, description:, amount: }
      t.string :classification, limit: 20                     # payment, deposit, transfer, skip
      t.jsonb :assigned_data, default: {}                     # { spending_category_id:, source_name:, etc. }
      t.string :status, limit: 20, default: "pending", null: false
        # pending, imported, skipped, duplicate, error
      t.string :error_message, limit: 500
      t.string :duplicate_key, limit: 128                     # SHA256(date|amount|normalized_desc)
      t.string :created_record_type, limit: 40                # Payment, IncomeEntry, TransferMaster
      t.bigint :created_record_id
      t.timestamps
    end

    add_index :import_session_rows, [:import_session_id, :row_number],
              name: "idx_isr_session_row", unique: true
    add_index :import_session_rows, [:import_session_id, :classification],
              name: "idx_isr_session_class"
    add_index :import_session_rows, [:import_session_id, :status],
              name: "idx_isr_session_status"
    add_index :import_session_rows, [:import_session_id, :duplicate_key],
              name: "idx_isr_duplicate_key"
  end
end
