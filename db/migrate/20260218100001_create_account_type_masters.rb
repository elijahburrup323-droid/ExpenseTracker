class CreateAccountTypeMasters < ActiveRecord::Migration[7.1]
  def change
    create_table :account_type_masters do |t|
      t.string :display_name, limit: 80, null: false
      t.string :normalized_key, limit: 80, null: false
      t.string :description, limit: 255
      t.boolean :is_active, default: true, null: false
      t.integer :sort_order, default: 0, null: false

      t.timestamps null: false
    end

    add_index :account_type_masters, :normalized_key, unique: true
    add_index :account_type_masters, :sort_order
  end
end
