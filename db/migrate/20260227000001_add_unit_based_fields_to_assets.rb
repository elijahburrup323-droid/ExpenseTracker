class AddUnitBasedFieldsToAssets < ActiveRecord::Migration[7.1]
  def change
    # --- Part A: Add unit-tracking columns to assets ---
    add_column :assets, :total_quantity,         :decimal, precision: 16, scale: 6
    add_column :assets, :total_cost_basis,       :decimal, precision: 12, scale: 2
    add_column :assets, :current_price_per_unit, :decimal, precision: 12, scale: 4
    add_column :assets, :unit_label,             :string,  limit: 20

    # --- Part B: Create asset_lots table ---
    create_table :asset_lots do |t|
      t.references :user,  null: false, foreign_key: true
      t.references :asset, null: false, foreign_key: true
      t.date    :acquired_date,  null: false
      t.decimal :quantity,       precision: 16, scale: 6, null: false
      t.decimal :price_per_unit, precision: 12, scale: 4, null: false
      t.decimal :total_cost,     precision: 12, scale: 2, null: false
      t.string  :notes,          limit: 500
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :asset_lots, [:asset_id, :acquired_date], name: "idx_asset_lots_asset_acquired"
    add_index :asset_lots, [:asset_id, :deleted_at],    name: "idx_asset_lots_asset_deleted"
    add_index :asset_lots, [:user_id, :deleted_at],     name: "idx_asset_lots_user_deleted"
  end
end
