class AddRateLimitingToVerifications < ActiveRecord::Migration[7.1]
  def change
    add_column :user_emails, :send_count, :integer, default: 0, null: false
    add_column :user_emails, :send_count_reset_at, :datetime
    add_column :user_emails, :verification_attempts, :integer, default: 0, null: false
    add_column :user_emails, :locked_until, :datetime

    add_column :user_phones, :send_count, :integer, default: 0, null: false
    add_column :user_phones, :send_count_reset_at, :datetime
    add_column :user_phones, :verification_attempts, :integer, default: 0, null: false
    add_column :user_phones, :locked_until, :datetime
  end
end
