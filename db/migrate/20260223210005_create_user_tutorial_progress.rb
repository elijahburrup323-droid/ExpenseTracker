class CreateUserTutorialProgress < ActiveRecord::Migration[7.1]
  def change
    create_table :user_tutorial_progress do |t|
      t.references :user, null: false, foreign_key: true
      t.references :feature_block, null: false, foreign_key: true
      t.integer :current_step, default: 0
      t.integer :total_steps, default: 0
      t.string :status, default: "pending"
      t.datetime :started_at
      t.datetime :completed_at

      t.timestamps
    end

    add_index :user_tutorial_progress, [:user_id, :feature_block_id], unique: true, name: "idx_user_tutorial_progress_unique"
  end
end
