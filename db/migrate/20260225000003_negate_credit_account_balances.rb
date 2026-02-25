class NegateCreditAccountBalances < ActiveRecord::Migration[7.1]
  def up
    # Collect CREDIT-normal account type master IDs
    credit_master_ids = execute(<<-SQL).map { |r| r["id"] }
      SELECT id FROM account_type_masters WHERE normal_balance_type = 'CREDIT'
    SQL
    return if credit_master_ids.empty?

    id_list = credit_master_ids.join(",")

    # 1. Negate account balances and beginning_balances for CREDIT accounts
    execute(<<-SQL)
      UPDATE accounts
      SET balance = -balance,
          beginning_balance = -beginning_balance
      WHERE account_type_master_id IN (#{id_list})
        AND deleted_at IS NULL
    SQL

    # 2. Negate account_month_snapshot balances for CREDIT accounts
    credit_account_ids = execute(<<-SQL).map { |r| r["id"] }
      SELECT id FROM accounts
      WHERE account_type_master_id IN (#{id_list})
    SQL

    if credit_account_ids.any?
      acct_list = credit_account_ids.join(",")
      execute(<<-SQL)
        UPDATE account_month_snapshots
        SET beginning_balance = -beginning_balance,
            ending_balance = -ending_balance
        WHERE account_id IN (#{acct_list})
      SQL

      # 3. Negate balance_adjustment amounts for CREDIT accounts
      execute(<<-SQL)
        UPDATE balance_adjustments
        SET amount = -amount
        WHERE account_id IN (#{acct_list})
      SQL
    end
  end

  def down
    # Reverse: negate again to restore original values
    credit_master_ids = execute(<<-SQL).map { |r| r["id"] }
      SELECT id FROM account_type_masters WHERE normal_balance_type = 'CREDIT'
    SQL
    return if credit_master_ids.empty?

    id_list = credit_master_ids.join(",")

    execute(<<-SQL)
      UPDATE accounts
      SET balance = -balance,
          beginning_balance = -beginning_balance
      WHERE account_type_master_id IN (#{id_list})
        AND deleted_at IS NULL
    SQL

    credit_account_ids = execute(<<-SQL).map { |r| r["id"] }
      SELECT id FROM accounts
      WHERE account_type_master_id IN (#{id_list})
    SQL

    if credit_account_ids.any?
      acct_list = credit_account_ids.join(",")
      execute(<<-SQL)
        UPDATE account_month_snapshots
        SET beginning_balance = -beginning_balance,
            ending_balance = -ending_balance
        WHERE account_id IN (#{acct_list})
      SQL

      execute(<<-SQL)
        UPDATE balance_adjustments
        SET amount = -amount
        WHERE account_id IN (#{acct_list})
      SQL
    end
  end
end
