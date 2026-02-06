class CreateSpendingTypes < ActiveRecord::Migration[7.1]
  def change
    create_table :spending_types do |t|
      t.references :user, null: false, foreign_key: true

      t.string :name, limit: 80, null: false
      t.string :description, limit: 255
      t.string :icon_key, limit: 40
      t.string :color_key, limit: 40
      t.integer :sort_order, default: 0, null: false
      t.boolean :is_system, default: false, null: false
      t.boolean :is_active, default: true, null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :spending_types, [:user_id, :sort_order]
    execute <<-SQL
      CREATE UNIQUE INDEX index_spending_types_on_user_id_and_lower_name
      ON spending_types (user_id, LOWER(name))
      WHERE deleted_at IS NULL;
    SQL
  end
end
