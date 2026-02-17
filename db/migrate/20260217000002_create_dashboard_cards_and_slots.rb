class CreateDashboardCardsAndSlots < ActiveRecord::Migration[7.1]
  def change
    create_table :dashboard_cards do |t|
      t.references :user, null: false, foreign_key: true
      t.string :card_key, limit: 60, null: false
      t.string :title, limit: 120, null: false
      t.string :card_type, limit: 60, null: false
      t.boolean :is_active, default: true, null: false
      t.timestamps null: false
    end

    add_index :dashboard_cards, [:user_id, :card_key], unique: true,
              name: "idx_dashboard_cards_user_card_key"

    create_table :dashboard_slots do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :slot_number, null: false
      t.references :dashboard_card, null: true, foreign_key: true
      t.timestamps null: false
    end

    add_index :dashboard_slots, [:user_id, :slot_number], unique: true,
              name: "idx_dashboard_slots_user_slot"
  end
end
