class CreateUserFeatureActivations < ActiveRecord::Migration[7.1]
  def change
    create_table :user_feature_activations do |t|
      t.references :user, null: false, foreign_key: true
      t.references :feature_block, null: false, foreign_key: true
      t.datetime :activated_at
      t.datetime :deactivated_at
      t.datetime :tutorial_completed_at
      t.datetime :tutorial_skipped_at

      t.timestamps
    end

    add_index :user_feature_activations, [:user_id, :feature_block_id], unique: true, name: "idx_user_feature_activations_unique"
  end
end
