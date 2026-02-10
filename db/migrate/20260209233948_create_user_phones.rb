class CreateUserPhones < ActiveRecord::Migration[7.1]
  def change
    create_table :user_phones do |t|
      t.references :user, null: false, foreign_key: true
      t.string :phone_number, null: false
      t.string :verification_code
      t.datetime :verification_sent_at
      t.datetime :verified_at

      t.timestamps
    end

    add_index :user_phones, [:user_id, :phone_number], unique: true
  end
end
