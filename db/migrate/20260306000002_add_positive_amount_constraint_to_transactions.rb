class AddPositiveAmountConstraintToTransactions < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      ALTER TABLE transactions
        ADD CONSTRAINT chk_positive_amount
        CHECK (amount > 0);
    SQL
  end

  def down
    execute "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_positive_amount;"
  end
end
