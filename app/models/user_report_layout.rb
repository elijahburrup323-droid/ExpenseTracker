class UserReportLayout < ApplicationRecord
  belongs_to :user

  validates :slot_number, presence: true,
            numericality: { only_integer: true, greater_than: 0 }
  validates :slot_number, uniqueness: { scope: :user_id }
  validates :report_key, presence: true, length: { maximum: 60 }
  validates :report_key, uniqueness: { scope: :user_id }
  validate :slot_number_within_range

  def self.seed_defaults_for(user)
    return if where(user_id: user.id).exists?

    ActiveRecord::Base.transaction do
      ReportsMenuLayout.active.ordered.each do |mapping|
        report = mapping.reports_master
        next unless report&.is_active

        user.user_report_layouts.create!(
          slot_number: mapping.slot_number,
          report_key: mapping.report_key
        )
      end
    end
  end

  def definition
    @definition ||= ReportsMaster.find_by(report_key: report_key)
  end

  private

  def slot_number_within_range
    max = ReportsSlotsMaster.max_slot
    if max > 0 && slot_number && slot_number > max
      errors.add(:slot_number, "must be between 1 and #{max}")
    end
  end
end
