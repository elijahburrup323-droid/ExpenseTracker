class SeedReportsMastersData < ActiveRecord::Migration[7.1]
  def up
    now = Time.current.utc.strftime("%Y-%m-%d %H:%M:%S")

    # Seed reports_masters with existing report definitions
    execute <<~SQL
      INSERT INTO reports_masters (report_key, title, category, description, icon_key, accent_style, route_path, is_active, sort_order_default, created_at, updated_at)
      VALUES
        ('monthly_cash_flow',       'Monthly Cash Flow',         'Cash Flow',       'Summary of monthly deposits and payments',          'currency',              'brand', NULL, TRUE, 1, '#{now}', '#{now}'),
        ('spending_by_category',    'Spending by Category',      'Spending',        'Breakdown of spending by category',                 'tag',                   'brand', NULL, TRUE, 2, '#{now}', '#{now}'),
        ('spending_by_type',        'Spending by Type',          'Spending',        'Analysis of fixed vs variable spending',             'archive',               'brand', NULL, TRUE, 3, '#{now}', '#{now}'),
        ('income_by_source',        'Income by Source',          'Income',          'Summary of income sources and amounts',              'chart-line',            'brand', NULL, TRUE, 4, '#{now}', '#{now}'),
        ('account_balance_history', 'Account Balance History',   'Accounts',        'Historical balances for each account',               'chart-bar',             'brand', NULL, TRUE, 5, '#{now}', '#{now}'),
        ('net_worth_report',        'Net Worth Report',          'Net Worth',       'Overview of assets and liabilities net worth',        'scale',                 'brand', NULL, TRUE, 6, '#{now}', '#{now}'),
        ('recurring_obligations',   'Recurring Obligations',     'Recurring',       'List of all recurring payments and deposits',         'refresh',               'brand', NULL, TRUE, 7, '#{now}', '#{now}'),
        ('reconciliation_summary',  'Reconciliation Summary',    'Reconciliation',  'Status and history of all account reconciliations',   'check-circle-outline',  'brand', NULL, TRUE, 8, '#{now}', '#{now}'),
        ('soft_close_summary',      'Soft Close Summary',        'Month Close',     'Summary of monthly soft close balances',              'lock',                  'brand', NULL, TRUE, 9, '#{now}', '#{now}')
    SQL

    # Seed reports_slots_masters with 9 slots
    (1..9).each do |n|
      execute "INSERT INTO reports_slots_masters (slot_number, is_active, created_at) VALUES (#{n}, TRUE, '#{now}')"
    end

    # Seed reports_menu_layouts with default 1:1 mapping
    reports = [
      [1, "monthly_cash_flow"],
      [2, "spending_by_category"],
      [3, "spending_by_type"],
      [4, "income_by_source"],
      [5, "account_balance_history"],
      [6, "net_worth_report"],
      [7, "recurring_obligations"],
      [8, "reconciliation_summary"],
      [9, "soft_close_summary"],
    ]

    reports.each do |slot, key|
      execute "INSERT INTO reports_menu_layouts (slot_number, report_key, is_active, created_at, updated_at) VALUES (#{slot}, '#{key}', TRUE, '#{now}', '#{now}')"
    end
  end

  def down
    execute "DELETE FROM reports_menu_layouts"
    execute "DELETE FROM reports_slots_masters"
    execute "DELETE FROM reports_masters"
  end
end
