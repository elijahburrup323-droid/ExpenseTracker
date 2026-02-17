class CreateTagsAndTagAssignments < ActiveRecord::Migration[7.1]
  def change
    create_table :tags do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, limit: 80, null: false
      t.string :color_key, limit: 40
      t.integer :sort_order, default: 0, null: false
      t.datetime :deleted_at
      t.timestamps null: false
    end

    add_index :tags, [:user_id, :name], unique: true,
              where: "deleted_at IS NULL",
              name: "idx_tags_user_name_active"

    create_table :tag_assignments do |t|
      t.references :user, null: false, foreign_key: true
      t.references :tag, null: false, foreign_key: true
      t.string :taggable_type, null: false
      t.bigint :taggable_id, null: false
      t.timestamps null: false
    end

    add_index :tag_assignments, [:taggable_type, :taggable_id, :tag_id],
              unique: true, name: "idx_tag_assignments_unique"
    add_index :tag_assignments, [:user_id, :taggable_type, :taggable_id],
              name: "idx_tag_assignments_user_taggable"
  end
end
