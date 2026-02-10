class SeedNetWorthReleaseNotes < ActiveRecord::Migration[7.1]
  def up
    today = "2026-02-10"

    entries = [
      ["Dashboard", "Replaced hardcoded Net Worth chart with real data-driven SVG line chart (1-6 months from net_worth_snapshots)"],
      ["Dashboard", "Added admin-only Populate Test Data control to generate 1-12 months of historical net worth data"],
      ["Database", "Created net_worth_snapshots table with user_id, snapshot_date, and amount columns"],
    ]

    entries.each do |screen_name, description|
      execute <<~SQL.squish
        INSERT INTO bug_reports (screen_name, description, processed_date, created_at, updated_at)
        VALUES ('#{screen_name}', '#{description.gsub("'", "''")}', '#{today}', NOW(), NOW())
      SQL
    end
  end

  def down
    execute "DELETE FROM bug_reports WHERE processed_date = '2026-02-10' AND screen_name IN ('Dashboard', 'Database')"
  end
end
