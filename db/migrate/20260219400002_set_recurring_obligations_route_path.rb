class SetRecurringObligationsRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/recurring_obligations'
      WHERE report_key = 'recurring_obligations'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'recurring_obligations'
    SQL
  end
end
