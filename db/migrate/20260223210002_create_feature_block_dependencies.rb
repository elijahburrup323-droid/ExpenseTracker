class CreateFeatureBlockDependencies < ActiveRecord::Migration[7.1]
  def change
    create_table :feature_block_dependencies do |t|
      t.references :feature_block, null: false, foreign_key: true
      t.references :depends_on, null: false, foreign_key: { to_table: :feature_blocks }

      t.timestamps
    end

    add_index :feature_block_dependencies, [:feature_block_id, :depends_on_id], unique: true, name: "idx_feature_block_deps_unique"
  end
end
