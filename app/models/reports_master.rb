class ReportsMaster < ApplicationRecord
  # Source-of-truth list of registered report routes.
  # Add new entries here as reports are implemented in routes.rb.
  REGISTERED_ROUTES = [
    { label: "Monthly Cash Flow",      path: "/reports/monthly_cash_flow" },
    { label: "Spending by Category",   path: "/reports/spending_by_category" },
    { label: "Recurring Obligations", path: "/reports/recurring_obligations" },
    { label: "Spending by Type", path: "/reports/spending_by_type" }
  ].freeze

  VALID_ROUTE_PATHS = REGISTERED_ROUTES.map { |r| r[:path] }.freeze

  has_one :reports_menu_layout, foreign_key: :report_key, primary_key: :report_key

  validates :report_key, presence: true, uniqueness: true, length: { maximum: 60 }
  validates :title, presence: true, length: { maximum: 120 }
  validates :category, presence: true, length: { maximum: 60 }
  validates :description, length: { maximum: 255 }
  validates :icon_key, length: { maximum: 40 }
  validates :accent_style, length: { maximum: 40 }
  validates :route_path, length: { maximum: 255 }
  validate :route_path_must_be_registered

  def route_path_must_be_registered
    return if route_path.blank?
    unless VALID_ROUTE_PATHS.include?(route_path)
      errors.add(:route_path, "is not a registered report route")
    end
  end

  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:sort_order_default, :title) }

  def in_use?
    UserReportLayout.where(report_key: report_key).exists?
  end

  def assigned_slot
    reports_menu_layout&.slot_number
  end
end
