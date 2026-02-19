class SetReconciliationSummaryRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/reconciliation_summary'
      WHERE report_key = 'reconciliation_summary'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'reconciliation_summary'
    SQL
  end
end
