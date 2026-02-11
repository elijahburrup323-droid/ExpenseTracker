class CreateQuotes < ActiveRecord::Migration[7.1]
  def change
    create_table :quotes do |t|
      t.text :quote_text, null: false
      t.string :quote_author, limit: 120
      t.boolean :is_active, default: true, null: false
      t.timestamps null: false
    end

    add_index :quotes, :is_active
  end
end
