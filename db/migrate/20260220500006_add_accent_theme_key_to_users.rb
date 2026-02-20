class AddAccentThemeKeyToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :accent_theme_key, :string, limit: 20, default: "purple", null: false
  end
end
