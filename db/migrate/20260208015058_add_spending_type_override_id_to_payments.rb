class AddSpendingTypeOverrideIdToPayments < ActiveRecord::Migration[7.1]
  def change
    add_column :payments, :spending_type_override_id, :bigint
    add_foreign_key :payments, :spending_types, column: :spending_type_override_id, on_delete: :nullify
  end
end
