class AddUniquePriorityZeroIndexToBuckets < ActiveRecord::Migration[7.1]
  def up
    # Fix existing data: for each account, keep only the default bucket at priority 0
    execute <<~SQL
      UPDATE buckets
      SET priority = 1
      WHERE deleted_at IS NULL
        AND priority = 0
        AND is_default = false
        AND id NOT IN (
          SELECT MIN(id)
          FROM buckets
          WHERE deleted_at IS NULL AND priority = 0
          GROUP BY account_id
          HAVING COUNT(*) > 1
        );
    SQL

    # For accounts with multiple priority-0 buckets, keep only the one marked default (or lowest id)
    execute <<~SQL
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY account_id
                 ORDER BY is_default DESC, id ASC
               ) AS rn
        FROM buckets
        WHERE deleted_at IS NULL AND priority = 0
      )
      UPDATE buckets
      SET priority = 1
      FROM ranked
      WHERE buckets.id = ranked.id AND ranked.rn > 1;
    SQL

    add_index :buckets, [:account_id, :priority],
              unique: true,
              where: "priority = 0 AND deleted_at IS NULL",
              name: "idx_buckets_unique_priority_zero_per_account"
  end

  def down
    remove_index :buckets, name: "idx_buckets_unique_priority_zero_per_account"
  end
end
