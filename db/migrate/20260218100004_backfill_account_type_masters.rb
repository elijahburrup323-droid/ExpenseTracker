class BackfillAccountTypeMasters < ActiveRecord::Migration[7.1]
  def up
    # Step 1: Discover unique account types across all users
    # Normalize by lowercasing and trimming
    existing_types = execute(<<-SQL).to_a
      SELECT DISTINCT TRIM(name) AS display_name,
             LOWER(TRIM(name)) AS normalized_key
      FROM account_types
      WHERE deleted_at IS NULL
      ORDER BY LOWER(TRIM(name))
    SQL

    # Step 2: Insert unique master records
    sort_order = 1
    existing_types.each do |row|
      display_name = row["display_name"]
      normalized_key = row["normalized_key"]

      # Skip if already inserted (handles case variants)
      existing = execute("SELECT id FROM account_type_masters WHERE normalized_key = #{quote(normalized_key)}").to_a
      next if existing.any?

      execute(<<-SQL)
        INSERT INTO account_type_masters (display_name, normalized_key, sort_order, is_active, created_at, updated_at)
        VALUES (#{quote(display_name)}, #{quote(normalized_key)}, #{sort_order}, TRUE, NOW(), NOW())
      SQL
      sort_order += 1
    end

    # Step 3: Create user_account_types for each user based on their existing account_types
    user_type_rows = execute(<<-SQL).to_a
      SELECT DISTINCT at.user_id, atm.id AS account_type_master_id
      FROM account_types at
      JOIN account_type_masters atm ON atm.normalized_key = LOWER(TRIM(at.name))
      WHERE at.deleted_at IS NULL
    SQL

    user_type_rows.each do |row|
      execute(<<-SQL)
        INSERT INTO user_account_types (user_id, account_type_master_id, is_enabled, created_at, updated_at)
        VALUES (#{row["user_id"]}, #{row["account_type_master_id"]}, TRUE, NOW(), NOW())
        ON CONFLICT (user_id, account_type_master_id) DO NOTHING
      SQL
    end

    # Step 4: Backfill accounts.account_type_master_id
    execute(<<-SQL)
      UPDATE accounts
      SET account_type_master_id = (
        SELECT atm.id
        FROM account_types at
        JOIN account_type_masters atm ON atm.normalized_key = LOWER(TRIM(at.name))
        WHERE at.id = accounts.account_type_id
        LIMIT 1
      )
      WHERE account_type_id IS NOT NULL
    SQL
  end

  def down
    execute("UPDATE accounts SET account_type_master_id = NULL")
    execute("DELETE FROM user_account_types")
    execute("DELETE FROM account_type_masters")
  end
end
