class AddUseFlagToAccountTypes < ActiveRecord::Migration[7.1]
  def change
    add_column :account_types, :use_flag, :boolean, default: true, null: false
  end
end
