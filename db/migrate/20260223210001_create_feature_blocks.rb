class CreateFeatureBlocks < ActiveRecord::Migration[7.1]
  def change
    create_table :feature_blocks do |t|
      t.string :key, null: false
      t.string :display_name, null: false
      t.string :tagline
      t.text :description
      t.string :icon
      t.string :category
      t.string :tier, null: false, default: "free"
      t.integer :sort_order, default: 0
      t.boolean :is_core, default: false
      t.jsonb :tutorial_data, default: {}
      t.string :estimated_setup

      t.timestamps
    end

    add_index :feature_blocks, :key, unique: true
  end
end
