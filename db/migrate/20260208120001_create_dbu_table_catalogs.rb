class CreateDbuTableCatalogs < ActiveRecord::Migration[7.1]
  def change
    create_table :dbu_table_catalogs do |t|
      t.string :table_name, null: false
      t.string :table_description
      t.boolean :is_active, default: true, null: false
      t.timestamps
    end

    add_index :dbu_table_catalogs, :table_name, unique: true
  end
end
