class ReportsMaster < ApplicationRecord
  has_one :reports_menu_layout, foreign_key: :report_key, primary_key: :report_key

  validates :report_key, presence: true, uniqueness: true, length: { maximum: 60 }
  validates :title, presence: true, length: { maximum: 120 }
  validates :category, presence: true, length: { maximum: 60 }
  validates :description, length: { maximum: 255 }
  validates :icon_key, length: { maximum: 40 }
  validates :accent_style, length: { maximum: 40 }
  validates :route_path, length: { maximum: 255 }

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:sort_order_default, :title) }

  def in_use?
    UserReportLayout.where(report_key: report_key).exists?
  end

  def assigned_slot
    reports_menu_layout&.slot_number
  end
end
