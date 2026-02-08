class AddBudgethqAgentToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :budgethq_agent, :boolean, default: false, null: false
  end
end
