class SeedMonthlySnapshotAuditReport < ActiveRecord::Migration[7.1]
  def up
    # Add the Monthly Snapshot Audit report master
    execute <<~SQL
      INSERT INTO reports_masters (report_key, title, category, description, icon_key, accent_style, route_path, is_active, sort_order_default, created_at, updated_at)
      SELECT 'monthly_snapshot_audit', 'Monthly Snapshot Audit', 'Diagnostics',
             'Compare snapshot balances against transaction detail to identify discrepancies.',
             'search', 'amber', '/reports/monthly_snapshot_audit', true, 11, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM reports_masters WHERE report_key = 'monthly_snapshot_audit');
    SQL

    # Add slots 10 and 11 if needed
    execute <<~SQL
      INSERT INTO reports_slots_masters (slot_number, is_active, created_at)
      SELECT 10, true, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM reports_slots_masters WHERE slot_number = 10);
    SQL
    execute <<~SQL
      INSERT INTO reports_slots_masters (slot_number, is_active, created_at)
      SELECT 11, true, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM reports_slots_masters WHERE slot_number = 11);
    SQL

    # Add menu layout entry
    execute <<~SQL
      INSERT INTO reports_menu_layouts (slot_number, report_key, is_active, created_at, updated_at)
      SELECT 10, 'monthly_snapshot_audit', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM reports_menu_layouts WHERE report_key = 'monthly_snapshot_audit');
    SQL

    # Seed user layouts for existing users who already have report layouts
    execute <<~SQL
      INSERT INTO user_report_layouts (user_id, report_key, slot_number, created_at, updated_at)
      SELECT DISTINCT u.user_id, 'monthly_snapshot_audit',
             (SELECT COALESCE(MAX(slot_number), 0) + 1 FROM user_report_layouts WHERE user_id = u.user_id),
             NOW(), NOW()
      FROM user_report_layouts u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_report_layouts
        WHERE user_id = u.user_id AND report_key = 'monthly_snapshot_audit'
      );
    SQL
  end

  def down
    execute "DELETE FROM user_report_layouts WHERE report_key = 'monthly_snapshot_audit'"
    execute "DELETE FROM reports_menu_layouts WHERE report_key = 'monthly_snapshot_audit'"
    execute "DELETE FROM reports_masters WHERE report_key = 'monthly_snapshot_audit'"
  end
end
