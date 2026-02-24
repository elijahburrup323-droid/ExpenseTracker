class FeatureBlockDependency < ApplicationRecord
  belongs_to :feature_block
  belongs_to :depends_on, class_name: "FeatureBlock"

  validates :feature_block_id, uniqueness: { scope: :depends_on_id }
end
