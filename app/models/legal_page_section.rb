class LegalPageSection < ApplicationRecord
  belongs_to :legal_page

  validates :section_number, presence: true
  validates :section_title, presence: true, length: { maximum: 200 }
  validates :section_body, presence: true
  validates :display_order, presence: true

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:display_order, :section_number) }
end
