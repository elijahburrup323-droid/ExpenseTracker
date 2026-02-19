class SetSoftCloseSummaryRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/soft_close_summary'
      WHERE report_key = 'soft_close_summary'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'soft_close_summary'
    SQL
  end
end
