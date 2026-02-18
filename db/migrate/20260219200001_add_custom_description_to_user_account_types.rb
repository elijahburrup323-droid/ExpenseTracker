class AddCustomDescriptionToUserAccountTypes < ActiveRecord::Migration[7.1]
  def change
    add_column :user_account_types, :custom_description, :string, limit: 255
  end
end
