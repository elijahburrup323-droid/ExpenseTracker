class CreateImportTemplates < ActiveRecord::Migration[7.1]
  def change
    create_table :import_templates do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, limit: 120, null: false
      t.string :file_type, limit: 10, null: false           # csv, ofx, qfx, qbo
      t.string :column_signature, limit: 64                  # SHA256 of sorted headers
      t.jsonb :column_mapping, default: {}                   # { col_index => field_key }
      t.jsonb :classification_rules, default: {}             # saved auto-classify overrides
      t.jsonb :assignment_defaults, default: {}              # default category, source, etc.
      t.references :default_account, null: true, foreign_key: { to_table: :accounts }
      t.string :amount_sign_convention, limit: 20, default: "negative_expense"
      t.string :date_format, limit: 20                       # MM/DD/YYYY, etc.
      t.integer :use_count, default: 0, null: false
      t.datetime :last_used_at
      t.datetime :deleted_at
      t.timestamps
    end

    add_index :import_templates, [:user_id, :column_signature],
              name: "idx_import_templates_user_sig",
              where: "deleted_at IS NULL"
    add_index :import_templates, [:user_id, :name],
              name: "idx_import_templates_user_name", unique: true,
              where: "deleted_at IS NULL"
  end
end
