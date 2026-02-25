class CreateAssetTypes < ActiveRecord::Migration[7.1]
  def change
    create_table :asset_types do |t|
      t.references :user, foreign_key: true           # NULL = system type, set = custom per-user
      t.string  :name,           limit: 80,  null: false
      t.string  :normalized_key, limit: 80,  null: false
      t.string  :description,    limit: 255
      t.string  :icon_key,       limit: 40
      t.boolean :is_active,      default: true, null: false
      t.integer :sort_order,     default: 0,   null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    # System types: unique normalized_key among system types
    add_index :asset_types, :normalized_key,
              unique: true,
              name: "idx_asset_types_system_key_unique",
              where: "user_id IS NULL AND deleted_at IS NULL"

    # Custom per-user types: unique normalized_key per user
    add_index :asset_types, [:user_id, :normalized_key],
              unique: true,
              name: "idx_asset_types_user_key_unique",
              where: "user_id IS NOT NULL AND deleted_at IS NULL"

    add_index :asset_types, :sort_order
  end
end
