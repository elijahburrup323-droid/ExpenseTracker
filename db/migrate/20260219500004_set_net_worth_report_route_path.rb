class SetNetWorthReportRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/net_worth_report'
      WHERE report_key = 'net_worth_report'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'net_worth_report'
    SQL
  end
end
