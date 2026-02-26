class CreateAuditLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :audit_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.string   :entity_type, limit: 60, null: false
      t.bigint   :entity_id,              null: false
      t.string   :action_type, limit: 30, null: false
      t.jsonb    :before_json, default: {}
      t.jsonb    :after_json,  default: {}
      t.jsonb    :metadata,    default: {}
      t.datetime :created_at,  null: false
    end

    add_index :audit_logs, :user_id, name: "idx_audit_logs_user_id"
    add_index :audit_logs, :entity_type, name: "idx_audit_logs_entity_type"
    add_index :audit_logs, [:entity_type, :entity_id], name: "idx_audit_logs_entity"
    add_index :audit_logs, :created_at, name: "idx_audit_logs_created_at"
  end
end
