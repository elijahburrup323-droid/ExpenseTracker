class ImportTemplate < ApplicationRecord
  belongs_to :user
  belongs_to :default_account, class_name: "Account", optional: true
  has_many :import_sessions

  default_scope { where(deleted_at: nil) }

  validates :name, presence: true, length: { maximum: 120 }
  validates :name, uniqueness: { scope: :user_id, conditions: -> { where(deleted_at: nil) }, case_sensitive: false }
  validates :file_type, presence: true, inclusion: { in: %w[csv ofx qfx qbo] }

  scope :ordered, -> { order(last_used_at: :desc, name: :asc) }

  def soft_delete!
    update_columns(deleted_at: Time.current)
  end

  def record_use!
    update_columns(use_count: use_count + 1, last_used_at: Time.current)
  end

  # Generate column_signature from an array of header strings
  def self.generate_signature(headers)
    normalized = headers.map { |h| h.to_s.downcase.strip }.sort
    Digest::SHA256.hexdigest(normalized.join("|"))
  end
end
