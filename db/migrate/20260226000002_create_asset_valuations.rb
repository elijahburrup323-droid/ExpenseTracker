class CreateAssetValuations < ActiveRecord::Migration[7.1]
  def change
    create_table :asset_valuations do |t|
      t.references :asset, null: false, foreign_key: true
      t.date    :valuation_date, null: false
      t.decimal :value, precision: 12, scale: 2, null: false
      t.string  :source, limit: 20, null: false, default: "manual"
      t.string  :notes, limit: 500
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :asset_valuations, [:asset_id, :valuation_date],
              name: "idx_asset_valuations_asset_date",
              order: { valuation_date: :desc }
    add_index :asset_valuations, [:asset_id, :deleted_at]
  end
end
