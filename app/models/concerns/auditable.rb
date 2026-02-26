module Auditable
  extend ActiveSupport::Concern

  included do
    class_attribute :audit_excluded_attrs, default: %w[created_at updated_at]
    class_attribute :audit_always_include_attrs, default: []

    after_create :_audit_log_create
    after_update :_audit_log_update
  end

  class_methods do
    def audit_exclude(*attrs)
      self.audit_excluded_attrs = audit_excluded_attrs + attrs.map(&:to_s)
    end

    def audit_include_always(*attrs)
      self.audit_always_include_attrs = audit_always_include_attrs + attrs.map(&:to_s)
    end
  end

  # Thread-safe user override for controllers where acting user differs from record.user_id.
  def self.with_audit_user(user_id)
    Thread.current[:_audit_user_id] = user_id
    yield
  ensure
    Thread.current[:_audit_user_id] = nil
  end

  # Soft-delete with audit logging. Replaces per-model soft_delete! methods.
  def soft_delete!
    before = _audit_snapshot
    update_columns(deleted_at: Time.current)
    _write_audit_log("DELETE", before_json: before, after_json: { "deleted_at" => deleted_at.iso8601 })
  end

  private

  def _audit_log_create
    _write_audit_log("CREATE", after_json: _audit_attrs_snapshot)
  end

  def _audit_log_update
    changes = _audit_changed_attrs
    return if changes[:before].blank? && changes[:after].blank?
    _write_audit_log("UPDATE", before_json: changes[:before], after_json: changes[:after])
  end

  def _write_audit_log(action, before_json: {}, after_json: {}, metadata: {})
    uid = Thread.current[:_audit_user_id] || _resolve_user_id
    return unless uid

    AuditLog.log!(
      user_id: uid,
      entity_type: self.class.name,
      entity_id: id,
      action_type: action,
      before_json: before_json,
      after_json: after_json,
      metadata: metadata
    )
  end

  def _resolve_user_id
    respond_to?(:user_id) ? user_id : nil
  end

  # Full attribute snapshot (for DELETE before-state and CREATE after-state).
  def _audit_snapshot
    _serialize_hash(attributes.except(*self.class.audit_excluded_attrs))
  end

  alias_method :_audit_attrs_snapshot, :_audit_snapshot

  # Only changed attributes (for UPDATE events).
  def _audit_changed_attrs
    changed = saved_changes.except(*self.class.audit_excluded_attrs)
    before = {}
    after = {}
    changed.each do |attr, (old_val, new_val)|
      before[attr] = _serialize_value(old_val)
      after[attr] = _serialize_value(new_val)
    end
    self.class.audit_always_include_attrs.each do |attr|
      next if after.key?(attr)
      after[attr] = _serialize_value(self[attr])
    end
    { before: before, after: after }
  end

  def _serialize_hash(hash)
    hash.transform_values { |v| _serialize_value(v) }
  end

  def _serialize_value(val)
    case val
    when BigDecimal then val.to_s("F")
    when Time, DateTime then val.iso8601
    when Date then val.to_s
    else val
    end
  end
end
