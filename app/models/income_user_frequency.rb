class IncomeUserFrequency < ApplicationRecord
  belongs_to :user
  belongs_to :frequency_master, class_name: "IncomeFrequencyMaster"

  scope :ordered, -> { order(:sort_order) }

  def self.seed_defaults_for(user)
    existing_ids = where(user_id: user.id).pluck(:frequency_master_id)
    IncomeFrequencyMaster.active.ordered.each do |master|
      next if existing_ids.include?(master.id)

      create!(
        user: user,
        frequency_master: master,
        use_flag: true,
        sort_order: master.sort_order
      )
    end
  end
end
