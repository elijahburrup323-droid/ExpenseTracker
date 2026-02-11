class CreateOpenMonthMasters < ActiveRecord::Migration[7.1]
  def change
    create_table :open_month_masters do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true, name: "idx_open_month_user" }
      t.integer :current_year, null: false
      t.integer :current_month, null: false
      t.boolean :is_closed, default: false, null: false
      t.datetime :locked_at
      t.references :locked_by_user, foreign_key: { to_table: :users }

      t.timestamps null: false
    end

    add_index :open_month_masters, [:user_id, :current_year, :current_month], name: "idx_open_month_period"
  end
end
