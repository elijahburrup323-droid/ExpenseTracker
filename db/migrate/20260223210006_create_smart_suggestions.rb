class CreateSmartSuggestions < ActiveRecord::Migration[7.1]
  def change
    create_table :smart_suggestions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :feature_block, null: false, foreign_key: true
      t.string :rule_key, null: false
      t.string :reason_text
      t.integer :priority, default: 50
      t.string :status, default: "pending"
      t.datetime :dismissed_at

      t.timestamps
    end

    add_index :smart_suggestions, [:user_id, :status]
  end
end
