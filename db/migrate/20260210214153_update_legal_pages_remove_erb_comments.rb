class UpdateLegalPagesRemoveErbComments < ActiveRecord::Migration[7.1]
  def up
    load Rails.root.join("db/seeds/legal_pages.rb")
  end

  def down
    # Content rollback not needed
  end
end
