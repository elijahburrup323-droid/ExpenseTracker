class AuditLog < ApplicationRecord
  belongs_to :user

  ACTION_TYPES = %w[CREATE UPDATE DELETE RECALCULATION].freeze

  validates :entity_type, presence: true
  validates :entity_id, presence: true
  validates :action_type, presence: true, inclusion: { in: ACTION_TYPES }

  scope :recent, ->(count = 50) { order(created_at: :desc).limit(count) }
  scope :for_entity, ->(type, id) { where(entity_type: type, entity_id: id) }
  scope :for_user, ->(user_id) { where(user_id: user_id) }
  scope :for_entity_type, ->(type) { where(entity_type: type) }
  scope :by_action, ->(action) { where(action_type: action) }

  # Safe creation that never raises — logs error and returns nil on failure.
  def self.log!(user_id:, entity_type:, entity_id:, action_type:, before_json: {}, after_json: {}, metadata: {})
    create!(
      user_id: user_id,
      entity_type: entity_type,
      entity_id: entity_id,
      action_type: action_type,
      before_json: before_json,
      after_json: after_json,
      metadata: metadata,
      created_at: Time.current
    )
  rescue => e
    Rails.logger.error("AuditLog: Failed to log #{action_type} for #{entity_type}##{entity_id}: #{e.message}")
    nil
  end
end
