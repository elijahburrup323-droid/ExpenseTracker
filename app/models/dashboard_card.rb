class DashboardCard < ApplicationRecord
  belongs_to :user
  has_one :dashboard_slot, dependent: :nullify
  has_one :dashboard_card_account_rule, dependent: :destroy

  validates :card_key, presence: true, length: { maximum: 60 }
  validates :card_key, uniqueness: { scope: :user_id }
  validates :title, presence: true, length: { maximum: 120 }
  validates :card_type, presence: true, length: { maximum: 60 }

  CARD_TYPES = %w[spending_overview accounts_overview net_worth income_spending recent_activity buckets].freeze

  DEFAULTS = [
    { card_key: "spending_overview",  title: "Spending Overview",  card_type: "spending_overview",  slot: 1 },
    { card_key: "accounts_overview",  title: "Accounts",           card_type: "accounts_overview",  slot: 2 },
    { card_key: "net_worth",          title: "Net Worth",          card_type: "net_worth",          slot: 3 },
    { card_key: "income_spending",    title: "Income & Spending",  card_type: "income_spending",    slot: 4 },
    { card_key: "recent_activity",    title: "Recent Payments",    card_type: "recent_activity",    slot: 5 },
    { card_key: "buckets",            title: "Buckets",            card_type: "buckets",            slot: 6 },
  ].freeze

  def self.seed_defaults_for(user)
    existing = where(user_id: user.id)

    if existing.exists?
      # Repair: ensure all default cards exist and are active
      DEFAULTS.each do |attrs|
        card = existing.find_by(card_key: attrs[:card_key])
        if card
          card.update!(is_active: true) unless card.is_active
        else
          card = user.dashboard_cards.create!(
            card_key: attrs[:card_key],
            title: attrs[:title],
            card_type: attrs[:card_type],
            is_active: true
          )
        end
        # Ensure card is linked to a slot
        unless card.dashboard_slot
          slot = user.dashboard_slots.find_by(slot_number: attrs[:slot])
          if slot && slot.dashboard_card_id.nil?
            slot.update!(dashboard_card: card)
          elsif slot.nil?
            user.dashboard_slots.create!(slot_number: attrs[:slot], dashboard_card: card)
          else
            # Slot taken by another card — find first open slot number
            used = user.dashboard_slots.pluck(:slot_number)
            free_slot = (1..12).find { |n| !used.include?(n) } || (used.max + 1)
            user.dashboard_slots.create!(slot_number: free_slot, dashboard_card: card)
          end
        end
        # Ensure account rule exists
        unless DashboardCardAccountRule.exists?(user_id: user.id, dashboard_card_id: card.id)
          DashboardCardAccountRule.create!(user: user, dashboard_card: card, match_mode: "all", is_enabled: true)
        end
      end
    else
      ActiveRecord::Base.transaction do
        DEFAULTS.each do |attrs|
          card = user.dashboard_cards.create!(
            card_key: attrs[:card_key],
            title: attrs[:title],
            card_type: attrs[:card_type],
            is_active: true
          )
          user.dashboard_slots.create!(
            slot_number: attrs[:slot],
            dashboard_card: card
          )
          DashboardCardAccountRule.create!(
            user: user,
            dashboard_card: card,
            match_mode: "all",
            is_enabled: true
          )
        end
      end
    end
  end
end
