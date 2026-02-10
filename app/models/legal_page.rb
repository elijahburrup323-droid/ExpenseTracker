class LegalPage < ApplicationRecord
  validates :slug, presence: true, uniqueness: true
  validates :title, presence: true

  scope :published, -> { where.not(published_at: nil) }

  def self.find_by_slug!(slug)
    find_by!(slug: slug)
  end
end
