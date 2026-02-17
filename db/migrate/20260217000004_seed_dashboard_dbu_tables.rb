class SeedDashboardDbuTables < ActiveRecord::Migration[7.1]
  def up
    tables = [
      { table_name: "tags", table_description: "User-defined Tags" },
      { table_name: "tag_assignments", table_description: "Polymorphic Tag Assignments" },
      { table_name: "dashboard_cards", table_description: "Dashboard Card Definitions" },
      { table_name: "dashboard_slots", table_description: "Dashboard Layout Slot Assignments" },
      { table_name: "dashboard_card_account_rules", table_description: "Dashboard Card Account Inclusion Rules" },
      { table_name: "dashboard_card_account_rule_tags", table_description: "Dashboard Card Account Rule Tag Join" },
    ]

    tables.each do |t|
      execute <<-SQL
        INSERT INTO dbu_table_catalogs (table_name, table_description, is_active, created_at, updated_at)
        VALUES (#{connection.quote(t[:table_name])}, #{connection.quote(t[:table_description])}, true, NOW(), NOW())
        ON CONFLICT (table_name) DO NOTHING
      SQL
    end
  end

  def down
    %w[tags tag_assignments dashboard_cards dashboard_slots dashboard_card_account_rules dashboard_card_account_rule_tags].each do |t|
      execute "DELETE FROM dbu_table_catalogs WHERE table_name = #{connection.quote(t)}"
    end
  end
end
