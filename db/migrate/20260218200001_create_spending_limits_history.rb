class CreateSpendingLimitsHistory < ActiveRecord::Migration[7.1]
  def change
    create_table :spending_limits_history do |t|
      t.references :user, null: false, foreign_key: true
      t.string :scope_type, limit: 20, null: false
      t.bigint :scope_id, null: false
      t.string :limit_mode, limit: 10, null: false
      t.decimal :limit_value, precision: 12, scale: 2, null: false
      t.integer :effective_start_yyyymm, null: false
      t.integer :effective_end_yyyymm
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :spending_limits_history,
              [:user_id, :scope_type, :scope_id, :effective_start_yyyymm, :effective_end_yyyymm],
              name: "idx_spending_limits_lookup"

    add_index :spending_limits_history,
              [:user_id, :scope_type, :scope_id],
              unique: true,
              where: "deleted_at IS NULL AND effective_end_yyyymm IS NULL",
              name: "idx_spending_limits_active_unique"
  end
end
