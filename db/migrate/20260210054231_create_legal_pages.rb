class CreateLegalPages < ActiveRecord::Migration[7.1]
  def change
    create_table :legal_pages do |t|
      t.string :slug
      t.string :title
      t.text :content
      t.datetime :published_at

      t.timestamps
    end
    add_index :legal_pages, :slug, unique: true
  end
end
