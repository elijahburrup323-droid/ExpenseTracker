class FeatureBlock < ApplicationRecord
  has_many :dependencies, class_name: "FeatureBlockDependency", dependent: :destroy
  has_many :prerequisite_blocks, through: :dependencies, source: :depends_on

  has_many :dependents, class_name: "FeatureBlockDependency", foreign_key: :depends_on_id, dependent: :destroy
  has_many :dependent_blocks, through: :dependents, source: :feature_block

  has_many :user_activations, class_name: "UserFeatureActivation", dependent: :destroy
  has_many :tutorial_progress_records, class_name: "UserTutorialProgress", dependent: :destroy
  has_many :smart_suggestions, dependent: :destroy

  validates :key, presence: true, uniqueness: true
  validates :display_name, presence: true
  validates :tier, inclusion: { in: %w[free paid advanced] }

  scope :core, -> { where(is_core: true) }
  scope :by_tier, ->(tier) { where(tier: tier) }
  scope :ordered, -> { order(:sort_order, :display_name) }

  def self.keys_map
    @_keys_map ||= pluck(:key, :id).to_h
  end

  def self.reset_keys_map!
    @_keys_map = nil
  end
end
