class DashboardCardAccountRule < ApplicationRecord
  belongs_to :user
  belongs_to :dashboard_card
  has_many :dashboard_card_account_rule_tags, dependent: :destroy
  has_many :tags, through: :dashboard_card_account_rule_tags

  MATCH_MODES = %w[all any_tag].freeze

  validates :match_mode, presence: true, inclusion: { in: MATCH_MODES }
  validates :dashboard_card_id, uniqueness: { scope: :user_id }

  def filtered_accounts(base_scope)
    return base_scope unless is_enabled
    return base_scope if match_mode == "all"

    tag_ids = dashboard_card_account_rule_tags.pluck(:tag_id)
    return base_scope if tag_ids.empty?

    tagged_account_ids = TagAssignment.where(
      taggable_type: "Account",
      tag_id: tag_ids
    ).pluck(:taggable_id)

    base_scope.where(id: tagged_account_ids)
  end
end
