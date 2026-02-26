class SeedCm28ReleaseNotes < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL.squish
      INSERT INTO bug_reports (screen_name, description, processed_date, created_at, updated_at)
      VALUES ('Assets', 'CM-28: asset_valuations table for historical valuation records with auto-sync to asset current_value via AssetValuationService', '2026-02-26', NOW(), NOW())
    SQL

    execute <<~SQL.squish
      INSERT INTO bug_reports (screen_name, description, processed_date, created_at, updated_at)
      VALUES ('Assets', 'CM-28: API endpoints — /api/assets CRUD, /api/asset_types CRUD (system read-only, custom per-user), /api/assets/:id/asset_valuations nested CRUD', '2026-02-26', NOW(), NOW())
    SQL

    execute <<~SQL.squish
      INSERT INTO dbu_table_catalogs (table_name, table_description, is_active, created_at, updated_at)
      VALUES ('asset_valuations', 'Historical Asset Valuation Records', true, NOW(), NOW())
      ON CONFLICT (table_name) DO NOTHING
    SQL

    say "Seeded CM-28 release notes and registered asset_valuations in DBU catalog"
  end

  def down
    # No-op
  end
end
