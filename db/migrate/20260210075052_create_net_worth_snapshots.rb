class CreateNetWorthSnapshots < ActiveRecord::Migration[7.1]
  def change
    create_table :net_worth_snapshots do |t|
      t.references :user, null: false, foreign_key: true
      t.date :snapshot_date, null: false
      t.decimal :amount, precision: 12, scale: 2, default: 0.0, null: false

      t.timestamps
    end

    add_index :net_worth_snapshots, [:user_id, :snapshot_date], unique: true
  end
end
