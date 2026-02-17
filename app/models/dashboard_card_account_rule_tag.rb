class DashboardCardAccountRuleTag < ApplicationRecord
  belongs_to :user
  belongs_to :dashboard_card_account_rule
  belongs_to :tag
end
