class SeedLegalPagesData < ActiveRecord::Migration[7.1]
  def up
    load Rails.root.join("db/seeds/legal_pages.rb")
  end

  def down
    execute "DELETE FROM legal_pages WHERE slug IN ('privacy', 'terms')"
  end
end
