class CreateReconciliationGroupUiStates < ActiveRecord::Migration[7.1]
  def change
    create_table :reconciliation_group_ui_states do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.integer :year, null: false
      t.integer :month, null: false
      t.string :group_type, null: false, limit: 20
      t.boolean :is_collapsed, null: false, default: false
      t.timestamps
    end

    add_index :reconciliation_group_ui_states,
              [:user_id, :account_id, :year, :month, :group_type],
              unique: true,
              name: "idx_recon_group_ui_unique"
  end
end
