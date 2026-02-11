class Quote < ApplicationRecord
  validates :quote_text, presence: true

  scope :active, -> { where(is_active: true) }

  def self.random_active
    active.order(Arel.sql("RANDOM()")).first
  end

  def self.cache_version
    Rails.cache.fetch("quotes_cache_version") { Time.current.to_i }
  end

  def self.invalidate_cache!
    Rails.cache.write("quotes_cache_version", Time.current.to_i)
  end
end
