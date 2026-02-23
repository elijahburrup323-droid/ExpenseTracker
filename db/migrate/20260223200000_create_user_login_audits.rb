class CreateUserLoginAudits < ActiveRecord::Migration[7.1]
  def change
    create_table :user_login_audits do |t|
      t.references :user, null: false, foreign_key: true

      # Identity / Session
      t.string  :user_email, null: false
      t.string  :role, null: false, default: "customer"
      t.string  :login_method, null: false, default: "password"
      t.string  :session_id

      # Network / Location
      t.string  :ip_address
      t.string  :geo_city
      t.string  :geo_region
      t.string  :geo_country

      # Device / Browser (parsed from user_agent)
      t.text    :user_agent_raw
      t.string  :browser_name
      t.string  :browser_version
      t.string  :os_name
      t.string  :os_version
      t.string  :device_type         # desktop / tablet / mobile
      t.string  :client_timezone
      t.string  :client_locale

      # Request Metadata
      t.string  :request_id
      t.string  :app_version
      t.string  :referrer

      # Success/failure
      t.boolean :success, null: false, default: true
      t.string  :failure_reason

      t.datetime :login_at, null: false
    end

    add_index :user_login_audits, :login_at
    add_index :user_login_audits, :ip_address
    add_index :user_login_audits, [:user_id, :login_at]
  end
end
