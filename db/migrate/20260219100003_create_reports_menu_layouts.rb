class CreateReportsMenuLayouts < ActiveRecord::Migration[7.1]
  def change
    create_table :reports_menu_layouts do |t|
      t.integer :slot_number, null: false
      t.string :report_key, limit: 60, null: false
      t.boolean :is_active, default: true, null: false
      t.timestamps null: false
    end

    add_index :reports_menu_layouts, :slot_number, unique: true
    add_index :reports_menu_layouts, :report_key, unique: true
  end
end
