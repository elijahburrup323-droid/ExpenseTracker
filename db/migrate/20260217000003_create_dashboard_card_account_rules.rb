class CreateDashboardCardAccountRules < ActiveRecord::Migration[7.1]
  def change
    create_table :dashboard_card_account_rules do |t|
      t.references :user, null: false, foreign_key: true
      t.references :dashboard_card, null: false, foreign_key: true
      t.string :match_mode, limit: 20, null: false, default: "all"
      t.boolean :is_enabled, default: true, null: false
      t.timestamps null: false
    end

    add_index :dashboard_card_account_rules, [:user_id, :dashboard_card_id],
              unique: true, name: "idx_card_account_rules_unique"

    create_table :dashboard_card_account_rule_tags do |t|
      t.references :user, null: false, foreign_key: true
      t.references :dashboard_card_account_rule, null: false, foreign_key: true,
                   index: { name: "idx_rule_tags_rule_id" }
      t.references :tag, null: false, foreign_key: true,
                   index: { name: "idx_rule_tags_tag_id" }
      t.timestamps null: false
    end
  end
end
