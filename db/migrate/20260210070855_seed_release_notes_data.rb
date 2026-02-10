class SeedReleaseNotesData < ActiveRecord::Migration[7.1]
  def up
    today = "2026-02-09"

    entries = [
      ["Frequencies", "Renamed View All button to All and added bulk enable/disable toggle"],
      ["Payments", "Resized Spending Type dropdown wider, shrunk Reset button"],
      ["Admin", "Renamed page title to Admin Users, removed duplicate Users sub-menu"],
      ["Sidebar", "Sorted sub-menus alphabetically within each navigation group"],
      ["Sidebar", "Added collapse/expand chevron arrows to navigation groups"],
      ["Header", "Removed Hide Quote icon - quote is always visible"],
      ["Header", "Moved Theme/Settings/Logout under profile icon dropdown (top right)"],
      ["Sidebar", "Added profile section at bottom with Theme, Settings, Sign Out"],
      ["Documentation", "Added Database Visualization page with ER diagram"],
      ["Documentation", "Added Release Notes page with paginated entries"],
      ["Settings", "Moved Two-Factor toggle under Phone Settings section"],
      ["Settings", "Added Email and Phone verification infrastructure with mailer and SMS"],
      ["Header", "Fixed profile dropdown clipped by overflow-hidden on header wrapper"],
      ["Header", "Restored sticky positioning on Hello header bar"],
      ["Sidebar", "Changed bottom profile from always-visible to click-to-expand dropdown"],
      ["Documentation", "Renamed Bug Reports Log to Release Notes"],
      ["Legal", "Added Privacy Policy page with 10 sections stored in legal_pages table"],
      ["Legal", "Added Terms of Service page stored in legal_pages table"],
      ["Footer", "Linked Privacy and Terms footer links to actual legal pages"],
    ]

    entries.each do |screen_name, description|
      execute <<~SQL.squish
        INSERT INTO bug_reports (screen_name, description, processed_date, created_at, updated_at)
        VALUES ('#{screen_name}', '#{description.gsub("'", "''")}', '#{today}', NOW(), NOW())
      SQL
    end
  end

  def down
    execute "DELETE FROM bug_reports WHERE processed_date = '2026-02-09'"
  end
end
