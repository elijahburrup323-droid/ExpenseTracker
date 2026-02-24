class CreateUserOnboardingProfiles < ActiveRecord::Migration[7.1]
  def change
    create_table :user_onboarding_profiles do |t|
      t.references :user, null: false, foreign_key: true, index: false
      t.string :persona
      t.integer :wizard_step
      t.datetime :wizard_completed_at
      t.references :first_account, foreign_key: { to_table: :accounts }

      t.timestamps
    end

    add_index :user_onboarding_profiles, :user_id, unique: true
  end
end
