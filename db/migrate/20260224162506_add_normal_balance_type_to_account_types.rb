class AddNormalBalanceTypeToAccountTypes < ActiveRecord::Migration[7.1]
  def up
    # --- 1. Add column to account_type_masters ---
    add_column :account_type_masters, :normal_balance_type, :string, limit: 6, null: false, default: "DEBIT"

    # --- 2. Backfill CREDIT for known liability types ---
    credit_keys = %w[
      credit\ card
      line\ of\ credit
      heloc
      mortgage
      auto\ loan
      student\ loan
      personal\ loan
      business\ loan
      other\ liability\ account
    ]

    credit_keys.each do |key|
      execute <<-SQL.squish
        UPDATE account_type_masters
        SET normal_balance_type = 'CREDIT'
        WHERE normalized_key = #{quote(key)}
      SQL
    end

    # --- 3. Insert 4 new master types ---
    new_types = [
      { display_name: "Personal Loan Receivable", normalized_key: "personal loan receivable", normal_balance_type: "DEBIT",  description: "Money owed to you via personal loan (asset)" },
      { display_name: "Personal Loan Payable",    normalized_key: "personal loan payable",    normal_balance_type: "CREDIT", description: "Money you owe on a personal loan (liability)" },
      { display_name: "Contract for Deed Receivable", normalized_key: "contract for deed receivable", normal_balance_type: "DEBIT",  description: "Contract for deed — you are the seller/lender (asset)" },
      { display_name: "Contract for Deed Payable",    normalized_key: "contract for deed payable",    normal_balance_type: "CREDIT", description: "Contract for deed — you are the buyer/borrower (liability)" },
    ]

    max_sort = execute("SELECT COALESCE(MAX(sort_order), 0) FROM account_type_masters").first["coalesce"].to_i

    new_types.each_with_index do |t, idx|
      existing = execute("SELECT id FROM account_type_masters WHERE normalized_key = #{quote(t[:normalized_key])} AND owner_user_id IS NULL").to_a
      next if existing.any?

      execute <<-SQL.squish
        INSERT INTO account_type_masters (display_name, normalized_key, description, normal_balance_type, is_active, sort_order, created_at, updated_at)
        VALUES (#{quote(t[:display_name])}, #{quote(t[:normalized_key])}, #{quote(t[:description])}, #{quote(t[:normal_balance_type])}, TRUE, #{max_sort + idx + 1}, NOW(), NOW())
      SQL
    end

    # --- 4. Add column to user_account_types ---
    add_column :user_account_types, :normal_balance_type, :string, limit: 6, null: false, default: "DEBIT"

    # --- 5. Backfill user_account_types from their master ---
    execute <<-SQL.squish
      UPDATE user_account_types
      SET normal_balance_type = atm.normal_balance_type
      FROM account_type_masters atm
      WHERE user_account_types.account_type_master_id = atm.id
    SQL
  end

  def down
    remove_column :user_account_types, :normal_balance_type
    remove_column :account_type_masters, :normal_balance_type

    # Remove the 4 new types (only if not in use)
    %w[personal\ loan\ receivable personal\ loan\ payable contract\ for\ deed\ receivable contract\ for\ deed\ payable].each do |key|
      execute <<-SQL.squish
        DELETE FROM account_type_masters
        WHERE normalized_key = #{quote(key)}
          AND owner_user_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM accounts WHERE accounts.account_type_master_id = account_type_masters.id)
      SQL
    end
  end
end
