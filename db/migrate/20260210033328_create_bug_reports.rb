class CreateBugReports < ActiveRecord::Migration[7.1]
  def change
    create_table :bug_reports do |t|
      t.string :screen_name
      t.text :description
      t.date :processed_date

      t.timestamps
    end
  end
end
