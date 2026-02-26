class SeedAuditTrailReleaseNotes < ActiveRecord::Migration[7.1]
  def up
    today = "2026-02-25"
    entries = [
      ["Audit", "Added audit_logs table for tracking changes to Assets, Investments & Financing entities (Instruction Set 2/4)"],
      ["Audit", "Auditable concern auto-logs CREATE/UPDATE/DELETE events via model callbacks with before/after JSON diffs"],
      ["Audit", "RecalculationAuditable concern provides explicit FIFO and amortization recalculation logging methods"],
      ["Admin", "Staff-only Audit Logs viewer at /admin/audit_logs with entity type and action filters"],
    ]
    entries.each do |screen_name, description|
      execute <<~SQL.squish
        INSERT INTO bug_reports (screen_name, description, processed_date, created_at, updated_at)
        VALUES ('#{screen_name}', '#{description.gsub("'", "''")}', '#{today}', NOW(), NOW())
      SQL
    end
  end

  def down
    execute "DELETE FROM bug_reports WHERE processed_date = '2026-02-25' AND screen_name IN ('Audit', 'Admin')"
  end
end
