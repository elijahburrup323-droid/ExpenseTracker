class RenameRecentActivityToRecentPayments < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      UPDATE dashboard_cards
      SET title = 'Recent Payments'
      WHERE card_key = 'recent_activity' AND title = 'Recent Activity'
    SQL
  end

  def down
    execute <<~SQL
      UPDATE dashboard_cards
      SET title = 'Recent Activity'
      WHERE card_key = 'recent_activity' AND title = 'Recent Payments'
    SQL
  end
end
