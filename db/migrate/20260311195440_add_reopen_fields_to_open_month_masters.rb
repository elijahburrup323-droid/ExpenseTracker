class AddReopenFieldsToOpenMonthMasters < ActiveRecord::Migration[7.1]
  def change
    add_column :open_month_masters, :is_reopened, :boolean, default: false, null: false
    add_column :open_month_masters, :forwarded_year, :integer
    add_column :open_month_masters, :forwarded_month, :integer
  end
end
