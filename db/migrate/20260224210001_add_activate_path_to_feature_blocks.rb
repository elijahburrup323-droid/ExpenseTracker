class AddActivatePathToFeatureBlocks < ActiveRecord::Migration[7.1]
  def change
    add_column :feature_blocks, :activate_path, :string
  end
end
