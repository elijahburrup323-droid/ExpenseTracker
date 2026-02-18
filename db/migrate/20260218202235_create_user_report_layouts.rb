class CreateUserReportLayouts < ActiveRecord::Migration[7.1]
  def change
    create_table :user_report_layouts do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :slot_number, null: false
      t.string :report_key, limit: 60, null: false
      t.timestamps null: false
    end

    add_index :user_report_layouts, [:user_id, :slot_number], unique: true,
              name: "idx_user_report_layouts_user_slot"
    add_index :user_report_layouts, [:user_id, :report_key], unique: true,
              name: "idx_user_report_layouts_user_key"
  end
end
