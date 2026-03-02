class AddEntryFieldsToAssetLots < ActiveRecord::Migration[7.1]
  def change
    add_column :asset_lots, :entry_form,    :string,  limit: 40
    add_column :asset_lots, :entry_quantity, :decimal, precision: 16, scale: 6
  end
end
