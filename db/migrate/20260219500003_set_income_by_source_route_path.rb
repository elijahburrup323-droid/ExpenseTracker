class SetIncomeBySourceRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/income_by_source'
      WHERE report_key = 'income_by_source'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'income_by_source'
    SQL
  end
end
