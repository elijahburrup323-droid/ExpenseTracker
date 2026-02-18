class CreateReportsMasters < ActiveRecord::Migration[7.1]
  def change
    create_table :reports_masters do |t|
      t.string :report_key, limit: 60, null: false
      t.string :title, limit: 120, null: false
      t.string :category, limit: 60, null: false
      t.string :description, limit: 255
      t.string :icon_key, limit: 40
      t.string :accent_style, limit: 40, default: "brand"
      t.string :route_path, limit: 255
      t.boolean :is_active, default: true, null: false
      t.integer :sort_order_default, default: 0, null: false
      t.timestamps null: false
    end

    add_index :reports_masters, :report_key, unique: true
    add_index :reports_masters, :is_active
    add_index :reports_masters, :sort_order_default
  end
end
