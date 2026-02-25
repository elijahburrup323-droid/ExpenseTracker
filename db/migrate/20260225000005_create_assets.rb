class CreateAssets < ActiveRecord::Migration[7.1]
  def change
    create_table :assets do |t|
      t.references :user,       null: false, foreign_key: true
      t.references :asset_type, null: false, foreign_key: true
      t.string  :name,               limit: 80,  null: false
      t.string  :description,        limit: 255
      t.decimal :current_value,      precision: 12, scale: 2, null: false, default: "0.0"
      t.decimal :purchase_price,     precision: 12, scale: 2
      t.date    :purchase_date
      t.boolean :include_in_net_worth, default: true, null: false
      t.string  :notes,              limit: 1000
      t.integer :sort_order,         default: 0, null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :assets, [:user_id, :deleted_at]
    add_index :assets, [:user_id, :asset_type_id]
    # Unique name per user among active assets
    add_index :assets, "user_id, lower(name)",
              unique: true,
              name: "idx_assets_user_name_unique",
              where: "deleted_at IS NULL"
  end
end
