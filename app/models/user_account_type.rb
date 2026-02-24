class UserAccountType < ApplicationRecord
  belongs_to :user
  belongs_to :account_type_master

  validates :account_type_master_id, uniqueness: { scope: :user_id }
  validates :normal_balance_type, inclusion: { in: %w[DEBIT CREDIT] }
end
