class TransactionMigrationMap < ApplicationRecord
  self.table_name = "transaction_migration_map"

  belongs_to :user
  belongs_to :canonical_transaction, class_name: "Transaction", foreign_key: :transaction_id

  LEGACY_TABLES = %w[payments income_entries transfer_masters].freeze

  validates :legacy_table, presence: true, inclusion: { in: LEGACY_TABLES }
  validates :legacy_id, presence: true
  validates :legacy_id, uniqueness: { scope: [:user_id, :legacy_table] }
end
