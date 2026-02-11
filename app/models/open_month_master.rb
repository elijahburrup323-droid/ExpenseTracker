class OpenMonthMaster < ApplicationRecord
  belongs_to :user
  belongs_to :locked_by_user, class_name: "User", optional: true

  validates :current_year, presence: true, numericality: { only_integer: true, greater_than: 2000 }
  validates :current_month, presence: true, numericality: { only_integer: true, in: 1..12 }
  validates :user_id, uniqueness: true

  def self.for_user(user)
    find_or_create_by!(user: user) do |record|
      now = Time.current
      record.current_year = now.year
      record.current_month = now.month
    end
  end
end
