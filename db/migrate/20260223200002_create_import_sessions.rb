class CreateImportSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :import_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :import_template, null: true, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.string :file_name, limit: 255, null: false
      t.string :file_type, limit: 10, null: false            # csv, ofx, qfx, qbo
      t.string :status, limit: 20, default: "parsing", null: false
        # parsing -> mapping -> classifying -> assigning -> ready -> importing -> completed / failed
      t.integer :row_count, default: 0, null: false
      t.integer :imported_count, default: 0, null: false
      t.integer :skipped_count, default: 0, null: false
      t.integer :duplicate_count, default: 0, null: false
      t.integer :error_count, default: 0, null: false
      t.jsonb :column_mapping, default: {}
      t.string :detected_date_format, limit: 20
      t.string :detected_amount_convention, limit: 20
      t.datetime :started_at
      t.datetime :completed_at
      t.timestamps
    end

    add_index :import_sessions, [:user_id, :status],
              name: "idx_import_sessions_user_status"
  end
end
