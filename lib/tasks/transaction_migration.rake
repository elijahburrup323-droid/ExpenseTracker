namespace :transactions do
  desc "Migrate legacy payments/deposits/transfers to canonical transactions table (repeatable)"
  task migrate: :environment do
    migrator = TransactionMigrator.new
    stats = migrator.migrate_all!

    puts "=== Transaction Migration Complete ==="
    stats.each do |type, counts|
      puts "  #{type}: #{counts[:migrated]} migrated, #{counts[:skipped]} skipped"
    end
    puts "  Total mappings: #{TransactionMigrationMap.count}"
  end

  desc "Migrate only payments"
  task migrate_payments: :environment do
    migrator = TransactionMigrator.new
    migrator.migrate_payments!
    puts "Payments: #{migrator.stats[:payments].inspect}"
  end

  desc "Migrate only deposits"
  task migrate_deposits: :environment do
    migrator = TransactionMigrator.new
    migrator.migrate_deposits!
    puts "Deposits: #{migrator.stats[:deposits].inspect}"
  end

  desc "Migrate only transfers"
  task migrate_transfers: :environment do
    migrator = TransactionMigrator.new
    migrator.migrate_transfers!
    puts "Transfers: #{migrator.stats[:transfers].inspect}"
  end
end
