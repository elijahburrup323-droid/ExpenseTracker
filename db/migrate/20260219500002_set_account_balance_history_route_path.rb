class SetAccountBalanceHistoryRoutePath < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = '/reports/account_balance_history'
      WHERE report_key = 'account_balance_history'
    SQL
  end

  def down
    execute <<-SQL
      UPDATE reports_masters
      SET route_path = NULL
      WHERE report_key = 'account_balance_history'
    SQL
  end
end
