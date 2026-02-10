class AddTwoFactorAndSubscriptionToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :two_factor_enabled, :boolean, default: false, null: false
    add_column :users, :subscription_active, :boolean, default: false, null: false
    add_column :users, :subscription_start_date, :date
    add_column :users, :subscription_expiration_date, :date
  end
end
