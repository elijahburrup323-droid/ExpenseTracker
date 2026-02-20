class BackfillPaymentTagsFromCategories < ActiveRecord::Migration[7.1]
  def up
    # For each non-deleted payment with a spending_category_id,
    # copy tag assignments from the spending category to the payment
    # (idempotent — skips existing assignments)
    execute <<~SQL
      INSERT INTO tag_assignments (user_id, tag_id, taggable_type, taggable_id, created_at, updated_at)
      SELECT p.user_id, cat_ta.tag_id, 'Payment', p.id, NOW(), NOW()
      FROM payments p
      INNER JOIN tag_assignments cat_ta
        ON cat_ta.taggable_type = 'SpendingCategory'
        AND cat_ta.taggable_id = p.spending_category_id
      WHERE p.deleted_at IS NULL
        AND p.spending_category_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM tag_assignments existing
          WHERE existing.taggable_type = 'Payment'
            AND existing.taggable_id = p.id
            AND existing.tag_id = cat_ta.tag_id
        )
    SQL
  end

  def down
    # No-op: removing backfilled tags could lose user-added tags
    # so we don't reverse this migration
  end
end
