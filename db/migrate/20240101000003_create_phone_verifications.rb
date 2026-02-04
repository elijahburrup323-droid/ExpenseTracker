class CreatePhoneVerifications < ActiveRecord::Migration[7.1]
  def change
    create_table :phone_verifications do |t|
      t.string :phone_number, null: false
      t.string :code, null: false
      t.datetime :expires_at, null: false
      t.datetime :verified_at

      t.timestamps null: false
    end

    add_index :phone_verifications, :phone_number
    add_index :phone_verifications, [:phone_number, :code]
  end
end
