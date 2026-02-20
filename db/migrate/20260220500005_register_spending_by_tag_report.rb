class RegisterSpendingByTagReport < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      INSERT INTO reports_masters (report_key, title, category, description, icon_key, route_path, is_active, sort_order_default, created_at, updated_at)
      VALUES ('spending_by_tag', 'Spending by Tag', 'Spending', 'Spending breakdown grouped by tag with amounts, percentages, and transaction counts', 'tag', '/reports/spending_by_tag', true, 10, NOW(), NOW())
      ON CONFLICT DO NOTHING
    SQL
  end

  def down
    execute "DELETE FROM reports_masters WHERE report_key = 'spending_by_tag'"
  end
end
