class AddPaymentRecurringIdToPayments < ActiveRecord::Migration[7.1]
  def change
    add_reference :payments, :payment_recurring, null: true, foreign_key: true
  end
end
