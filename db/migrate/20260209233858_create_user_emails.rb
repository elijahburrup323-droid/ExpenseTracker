class CreateUserEmails < ActiveRecord::Migration[7.1]
  def change
    create_table :user_emails do |t|
      t.references :user, null: false, foreign_key: true
      t.string :email, null: false
      t.string :verification_code
      t.datetime :verification_sent_at
      t.datetime :verified_at

      t.timestamps
    end

    add_index :user_emails, [:user_id, :email], unique: true
  end
end
