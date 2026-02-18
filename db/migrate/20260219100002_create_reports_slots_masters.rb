class CreateReportsSlotsMasters < ActiveRecord::Migration[7.1]
  def change
    create_table :reports_slots_masters, id: false do |t|
      t.integer :slot_number, null: false, primary_key: true
      t.boolean :is_active, default: true, null: false
      t.datetime :created_at, null: false
    end
  end
end
