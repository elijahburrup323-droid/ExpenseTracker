class AddSidebarStateJsonToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :sidebar_state_json, :text
  end
end
