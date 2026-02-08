class SeedDbuTableCatalog < ActiveRecord::Migration[7.1]
  def up
    tables = [
      { table_name: "users",                     table_description: "User Accounts" },
      { table_name: "accounts",                  table_description: "Financial Accounts" },
      { table_name: "account_types",             table_description: "Account Type Definitions" },
      { table_name: "payments",                  table_description: "Payment Transactions" },
      { table_name: "spending_categories",       table_description: "Spending Categories" },
      { table_name: "spending_types",            table_description: "Spending Type Definitions" },
      { table_name: "income_entries",            table_description: "Income Entries" },
      { table_name: "income_recurrings",         table_description: "Recurring Income Sources" },
      { table_name: "income_user_frequencies",   table_description: "User Frequency Selections" },
      { table_name: "income_frequency_masters",  table_description: "Master Frequency Options" },
      { table_name: "dbu_table_catalogs",        table_description: "DBU Table Catalog" },
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
    execute "DELETE FROM dbu_table_catalogs"
  end
end
