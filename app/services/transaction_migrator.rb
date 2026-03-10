class TransactionMigrator
  attr_reader :stats

  def initialize
    @stats = { payments: { migrated: 0, skipped: 0 }, deposits: { migrated: 0, skipped: 0 }, transfers: { migrated: 0, skipped: 0 } }
  end

  def migrate_all!
    migrate_payments!
    migrate_deposits!
    migrate_transfers!
    stats
  end

  def migrate_payments!
    Payment.unscoped.find_each do |p|
      next if already_migrated?(p.user_id, "payments", p.id)

      txn = Transaction.unscoped.create!(
        user_id: p.user_id,
        txn_date: p.payment_date,
        txn_type: "payment",
        amount: p.amount.abs,
        description: p.description,
        memo: p.notes,
        account_id: p.account_id,
        spending_category_id: p.spending_category_id,
        spending_type_id: p.spending_type_override_id,
        reconciled: p.reconciled,
        deleted_at: p.deleted_at,
        created_at: p.created_at,
        updated_at: p.updated_at
      )
      record_mapping!(p.user_id, "payments", p.id, txn.id)
      stats[:payments][:migrated] += 1
    rescue => e
      Rails.logger.error("TransactionMigrator: payment #{p.id} failed: #{e.message}")
      stats[:payments][:skipped] += 1
    end
  end

  def migrate_deposits!
    # Only migrate received deposits — unreceived entries are planned, not actual activity
    IncomeEntry.unscoped.where(received_flag: true).find_each do |d|
      next if already_migrated?(d.user_id, "income_entries", d.id)

      txn = Transaction.unscoped.create!(
        user_id: d.user_id,
        txn_date: d.entry_date,
        txn_type: "deposit",
        amount: d.amount.abs,
        description: d.source_name,
        memo: d.description,
        account_id: d.account_id,
        reconciled: d.reconciled,
        deleted_at: d.deleted_at,
        created_at: d.created_at,
        updated_at: d.updated_at
      )
      record_mapping!(d.user_id, "income_entries", d.id, txn.id)
      stats[:deposits][:migrated] += 1
    rescue => e
      Rails.logger.error("TransactionMigrator: income_entry #{d.id} failed: #{e.message}")
      stats[:deposits][:skipped] += 1
    end
  end

  def migrate_transfers!
    TransferMaster.find_each do |t|
      next if already_migrated?(t.user_id, "transfer_masters", t.id)

      txn = Transaction.unscoped.create!(
        user_id: t.user_id,
        txn_date: t.transfer_date,
        txn_type: "transfer",
        amount: t.amount.abs,
        memo: t.memo,
        from_account_id: t.from_account_id,
        to_account_id: t.to_account_id,
        reconciled: t.reconciled,
        created_at: t.created_at,
        updated_at: t.updated_at
      )
      record_mapping!(t.user_id, "transfer_masters", t.id, txn.id)
      stats[:transfers][:migrated] += 1
    rescue => e
      Rails.logger.error("TransactionMigrator: transfer_master #{t.id} failed: #{e.message}")
      stats[:transfers][:skipped] += 1
    end
  end

  private

  def already_migrated?(user_id, legacy_table, legacy_id)
    if TransactionMigrationMap.exists?(user_id: user_id, legacy_table: legacy_table, legacy_id: legacy_id)
      category = legacy_table == "income_entries" ? :deposits : (legacy_table == "payments" ? :payments : :transfers)
      stats[category][:skipped] += 1
      true
    else
      false
    end
  end

  def record_mapping!(user_id, legacy_table, legacy_id, transaction_id)
    TransactionMigrationMap.create!(
      user_id: user_id,
      legacy_table: legacy_table,
      legacy_id: legacy_id,
      transaction_id: transaction_id
    )
  end
end
