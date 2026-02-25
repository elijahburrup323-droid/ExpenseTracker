class SeedAssetTypes < ActiveRecord::Migration[7.1]
  def up
    system_types = [
      { name: "Real Estate",          description: "Primary residence, rental properties, land",        sort_order: 1 },
      { name: "Vehicle",              description: "Cars, trucks, motorcycles, boats, RVs",             sort_order: 2 },
      { name: "Jewelry & Watches",    description: "Fine jewelry, luxury watches, gemstones",           sort_order: 3 },
      { name: "Art & Collectibles",   description: "Fine art, antiques, memorabilia, coins",            sort_order: 4 },
      { name: "Electronics",          description: "Computers, phones, audio equipment, cameras",       sort_order: 5 },
      { name: "Furniture",            description: "Home furnishings, appliances",                      sort_order: 6 },
      { name: "Tools & Equipment",    description: "Power tools, workshop equipment, machinery",        sort_order: 7 },
      { name: "Sporting Goods",       description: "Fitness equipment, bikes, outdoor gear",            sort_order: 8 },
      { name: "Musical Instruments",  description: "Guitars, pianos, professional audio gear",          sort_order: 9 },
      { name: "Precious Metals",      description: "Gold, silver, platinum bullion or coins",           sort_order: 10 },
      { name: "Cryptocurrency",       description: "Bitcoin, Ethereum, and other digital assets",       sort_order: 11 },
      { name: "Business Interest",    description: "Ownership stake in a business or partnership",      sort_order: 12 },
      { name: "Intellectual Property", description: "Patents, trademarks, copyrights, royalties",       sort_order: 13 },
      { name: "Other",                description: "Assets not covered by other categories",            sort_order: 14 },
    ]

    system_types.each do |attrs|
      normalized_key = attrs[:name].strip.downcase
      execute <<~SQL.squish
        INSERT INTO asset_types (user_id, name, normalized_key, description, icon_key, is_active, sort_order, deleted_at, created_at, updated_at)
        VALUES (NULL, #{connection.quote(attrs[:name])}, #{connection.quote(normalized_key)},
                #{connection.quote(attrs[:description])}, NULL, true, #{attrs[:sort_order]}, NULL, NOW(), NOW())
        ON CONFLICT DO NOTHING
      SQL
    end

    say "Seeded #{system_types.size} system asset types"

    # Register new tables in DBU catalog
    new_tables = [
      { table_name: "asset_types",                    table_description: "Asset Category Definitions" },
      { table_name: "assets",                         table_description: "User Physical & Intangible Assets" },
      { table_name: "investment_holdings",            table_description: "Per-Security Investment Holdings" },
      { table_name: "investment_transactions",        table_description: "Investment Buy/Sell Transactions" },
      { table_name: "investment_lots",                table_description: "FIFO Cost Basis Lots" },
      { table_name: "financing_instruments",          table_description: "Loans & Financing Instruments" },
      { table_name: "financing_payments",             table_description: "Financing Payment History" },
      { table_name: "amortization_schedule_entries",  table_description: "Amortization Schedule Projections" },
    ]

    new_tables.each do |t|
      execute <<~SQL.squish
        INSERT INTO dbu_table_catalogs (table_name, table_description, is_active, created_at, updated_at)
        VALUES (#{connection.quote(t[:table_name])}, #{connection.quote(t[:table_description])}, true, NOW(), NOW())
        ON CONFLICT (table_name) DO NOTHING
      SQL
    end

    say "Registered #{new_tables.size} tables in DBU catalog"
  end

  def down
    # No-op: we don't remove seeds on rollback
  end
end
