class CreateLegacyCompatibilityViews < ActiveRecord::Migration[7.1]
  def up
    # payments_view: maps transactions (txn_type='payment') to legacy payments column names
    execute <<~SQL
      CREATE VIEW payments_view AS
      SELECT
        id,
        user_id,
        account_id,
        spending_category_id AS spending_category_id,
        spending_type_id AS spending_type_override_id,
        txn_date AS payment_date,
        description,
        memo AS notes,
        amount,
        reconciled,
        cleared,
        NULL::bigint AS payment_recurring_id,
        NULL::bigint AS bucket_id,
        false AS is_bucket_execution,
        NULL::integer AS sort_order,
        created_at,
        updated_at
      FROM transactions
      WHERE txn_type = 'payment'
        AND deleted_at IS NULL;
    SQL

    # deposits_view: maps transactions (txn_type='deposit') to legacy income_entries column names
    execute <<~SQL
      CREATE VIEW deposits_view AS
      SELECT
        id,
        user_id,
        account_id,
        NULL::bigint AS income_recurring_id,
        description AS source_name,
        memo AS description,
        txn_date AS entry_date,
        amount,
        NULL::bigint AS frequency_master_id,
        false AS received_flag,
        NULL::integer AS sort_order,
        reconciled,
        created_at,
        updated_at
      FROM transactions
      WHERE txn_type = 'deposit'
        AND deleted_at IS NULL;
    SQL

    # transfers_view: maps transactions (txn_type='transfer') to legacy transfer_masters column names
    execute <<~SQL
      CREATE VIEW transfers_view AS
      SELECT
        id,
        user_id,
        txn_date AS transfer_date,
        from_account_id,
        to_account_id,
        amount,
        memo,
        reconciled,
        NULL::bigint AS from_bucket_id,
        NULL::bigint AS to_bucket_id,
        NULL::bigint AS recurring_transfer_id,
        created_at,
        updated_at
      FROM transactions
      WHERE txn_type = 'transfer'
        AND deleted_at IS NULL;
    SQL
  end

  def down
    execute "DROP VIEW IF EXISTS payments_view;"
    execute "DROP VIEW IF EXISTS deposits_view;"
    execute "DROP VIEW IF EXISTS transfers_view;"
  end
end
