class CreateIdentities < ActiveRecord::Migration[7.1]
  def change
    create_table :identities do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :uid, null: false
      t.string :access_token
      t.string :refresh_token
      t.datetime :expires_at

      t.timestamps null: false
    end

    add_index :identities, [:provider, :uid], unique: true
    add_index :identities, [:user_id, :provider], unique: true
  end
end
