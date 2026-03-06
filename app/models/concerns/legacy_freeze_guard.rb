module LegacyFreezeGuard
  extend ActiveSupport::Concern

  included do
    before_create :guard_legacy_freeze!, if: -> { self.class.legacy_frozen? }
    before_update :guard_legacy_freeze_update!, if: -> { self.class.legacy_frozen? }
  end

  class_methods do
    def legacy_frozen?
      Rails.application.config.respond_to?(:legacy_tables_frozen) &&
        Rails.application.config.legacy_tables_frozen
    end
  end

  private

  def guard_legacy_freeze!
    Rails.logger.warn("LegacyFreezeGuard: blocked CREATE on #{self.class.name} (legacy tables frozen)")
    throw(:abort)
  end

  def guard_legacy_freeze_update!
    # Allow soft-delete (deleted_at) and reconciled updates only
    changed_cols = changed - %w[deleted_at reconciled updated_at]
    return if changed_cols.empty?

    Rails.logger.warn("LegacyFreezeGuard: blocked UPDATE on #{self.class.name}##{id} (legacy tables frozen, changed: #{changed_cols.join(', ')})")
    throw(:abort)
  end
end
