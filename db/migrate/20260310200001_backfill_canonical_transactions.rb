class BackfillCanonicalTransactions < ActiveRecord::Migration[7.1]
  def up
    say "Running TransactionMigrator backfill (idempotent)..."
    migrator = TransactionMigrator.new
    stats = migrator.migrate_all!
    say "Backfill complete: #{stats.inspect}"

    # Clean up canonical records for unreceived deposits (old dual-write bug)
    count = 0
    TransactionMigrationMap.where(legacy_table: "income_entries").find_each do |mapping|
      entry = IncomeEntry.unscoped.find_by(id: mapping.legacy_id)
      next unless entry
      next if entry.received_flag

      txn = Transaction.unscoped.find_by(id: mapping.transaction_id)
      if txn && txn.deleted_at.nil?
        txn.update_columns(deleted_at: Time.current)
        count += 1
      end
    end
    say "Soft-deleted #{count} unreceived deposit transactions"
  end

  def down
    say "Skipping rollback — canonical transactions are preserved."
  end
end
