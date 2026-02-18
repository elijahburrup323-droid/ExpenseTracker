class SetMonthlyCashFlowRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/monthly_cash_flow'
      WHERE report_key = 'monthly_cash_flow'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'monthly_cash_flow'
    SQL
  end
end
