class AddDepreciationFieldsToAssets < ActiveRecord::Migration[7.1]
  def change
    add_column :assets, :depreciation_method, :string, default: "NONE", null: false
    add_column :assets, :annual_rate, :decimal, precision: 8, scale: 4
    add_column :assets, :useful_life_years, :integer
    add_column :assets, :projection_enabled, :boolean, default: false, null: false
  end
end
