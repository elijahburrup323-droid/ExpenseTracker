class AddSecondaryEmailToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :secondary_email, :string
    add_index :users, :secondary_email, unique: true,
              where: "secondary_email IS NOT NULL AND secondary_email != ''"
  end
end
