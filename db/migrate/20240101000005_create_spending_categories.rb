class CreateSpendingCategories < ActiveRecord::Migration[7.1]
  def change
    create_table :spending_categories do |t|
      t.references :user, null: false, foreign_key: true
      t.references :spending_type, null: false, foreign_key: true

      t.string :name, limit: 80, null: false
      t.string :description, limit: 255, null: false
      t.boolean :is_debt, default: false, null: false
      t.string :icon_key, limit: 40
      t.string :color_key, limit: 40
      t.integer :sort_order, default: 0, null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :spending_categories, [:user_id, :sort_order]
    execute <<-SQL
      CREATE UNIQUE INDEX index_spending_categories_on_user_id_and_lower_name
      ON spending_categories (user_id, LOWER(name))
      WHERE deleted_at IS NULL;
    SQL
  end
end
