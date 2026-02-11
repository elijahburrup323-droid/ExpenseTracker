class Quote < ApplicationRecord
  validates :quote_text, presence: true

  scope :active, -> { where(is_active: true) }

  def self.random_active
    active.order(Arel.sql("RANDOM()")).first
  end
end
