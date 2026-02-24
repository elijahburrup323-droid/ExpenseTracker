class UserOnboardingProfile < ApplicationRecord
  belongs_to :user
  belongs_to :first_account, class_name: "Account", optional: true

  validates :user_id, uniqueness: true
  validates :persona, inclusion: { in: %w[bill_payer saver full_manager exploring] }, allow_nil: true

  PERSONA_BLOCKS = {
    "bill_payer" => %w[core_dashboard accounts_basic payments_basic recurring_payments],
    "saver" => %w[core_dashboard accounts_basic payments_basic income_tracking buckets],
    "full_manager" => %w[core_dashboard accounts_basic payments_basic income_tracking recurring_income recurring_payments transfers tags buckets],
    "exploring" => %w[core_dashboard accounts_basic]
  }.freeze

  def completed?
    wizard_completed_at.present?
  end

  def blocks_for_persona
    PERSONA_BLOCKS.fetch(persona, PERSONA_BLOCKS["exploring"])
  end
end
