class DbuTableCatalog < ApplicationRecord
  validates :table_name, presence: true, uniqueness: true

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:table_name) }
end
