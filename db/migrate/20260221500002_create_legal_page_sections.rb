class CreateLegalPageSections < ActiveRecord::Migration[7.1]
  def change
    create_table :legal_page_sections do |t|
      t.references :legal_page, null: false, foreign_key: true
      t.integer :section_number, null: false
      t.string :section_title, null: false
      t.text :section_body, null: false
      t.integer :display_order, null: false, default: 0
      t.boolean :is_active, null: false, default: true
      t.bigint :updated_by
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end

    add_index :legal_page_sections, [:legal_page_id, :display_order], name: "idx_legal_sections_page_order"
  end
end
