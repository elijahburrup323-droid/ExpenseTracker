class SpendingLimitHistory < ApplicationRecord
  self.table_name = "spending_limits_history"

  belongs_to :user

  default_scope { where(deleted_at: nil) }

  SCOPE_CATEGORY      = "CATEGORY".freeze
  SCOPE_SPENDING_TYPE = "SPENDING_TYPE".freeze
  MODE_AMOUNT  = "AMOUNT".freeze
  MODE_PERCENT = "PERCENT".freeze

  validates :scope_type, presence: true, inclusion: { in: [SCOPE_CATEGORY, SCOPE_SPENDING_TYPE] }
  validates :scope_id, presence: true
  validates :limit_mode, presence: true, inclusion: { in: [MODE_AMOUNT, MODE_PERCENT] }
  validates :limit_value, presence: true, numericality: { greater_than: 0 }
  validates :effective_start_yyyymm, presence: true
  validate :mode_matches_scope_type

  scope :for_month, ->(yyyymm) {
    where("effective_start_yyyymm <= ?", yyyymm)
      .where("effective_end_yyyymm IS NULL OR effective_end_yyyymm >= ?", yyyymm)
  }

  scope :for_scope, ->(scope_type, scope_id) {
    where(scope_type: scope_type, scope_id: scope_id)
  }

  scope :currently_active, -> { where(effective_end_yyyymm: nil) }

  # Set or update a limit with effective-dated versioning
  def self.set_limit!(user:, scope_type:, scope_id:, limit_value:, effective_yyyymm:)
    limit_mode = scope_type == SCOPE_CATEGORY ? MODE_AMOUNT : MODE_PERCENT

    ActiveRecord::Base.transaction do
      current = user.spending_limit_histories
                    .currently_active
                    .for_scope(scope_type, scope_id)
                    .lock("FOR UPDATE")
                    .first

      if current
        prev_yyyymm = prev_month_yyyymm(effective_yyyymm)
        current.update!(effective_end_yyyymm: prev_yyyymm)
      end

      user.spending_limit_histories.create!(
        scope_type: scope_type,
        scope_id: scope_id,
        limit_mode: limit_mode,
        limit_value: limit_value,
        effective_start_yyyymm: effective_yyyymm,
        effective_end_yyyymm: nil
      )
    end
  end

  # Bulk-load all limits for a scope_type and month, keyed by scope_id
  def self.limits_for_month(user, scope_type, yyyymm)
    user.spending_limit_histories
        .where(scope_type: scope_type)
        .for_month(yyyymm)
        .index_by(&:scope_id)
  end

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  private

  def mode_matches_scope_type
    if scope_type == SCOPE_CATEGORY && limit_mode != MODE_AMOUNT
      errors.add(:limit_mode, "must be AMOUNT for CATEGORY scope")
    elsif scope_type == SCOPE_SPENDING_TYPE && limit_mode != MODE_PERCENT
      errors.add(:limit_mode, "must be PERCENT for SPENDING_TYPE scope")
    end
  end

  def self.prev_month_yyyymm(yyyymm)
    year = yyyymm / 100
    month = yyyymm % 100
    if month == 1
      (year - 1) * 100 + 12
    else
      year * 100 + (month - 1)
    end
  end
end
