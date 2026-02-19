class SetSpendingByTypeRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/spending_by_type'
      WHERE report_key = 'spending_by_type'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'spending_by_type'
    SQL
  end
end
