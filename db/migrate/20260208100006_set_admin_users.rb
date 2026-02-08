class SetAdminUsers < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      UPDATE users SET budgethq_agent = true
      WHERE LOWER(email) IN ('elijahburrup323@gmail.com', 'djburrup@gmail.com')
    SQL
  end

  def down
    execute <<-SQL
      UPDATE users SET budgethq_agent = false
      WHERE LOWER(email) IN ('elijahburrup323@gmail.com', 'djburrup@gmail.com')
    SQL
  end
end
