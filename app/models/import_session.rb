class ImportSession < ApplicationRecord
  belongs_to :user
  belongs_to :import_template, optional: true
  belongs_to :account
  has_many :import_session_rows, dependent: :destroy

  STATUSES = %w[parsing mapping classifying assigning ready importing completed failed].freeze

  validates :file_name, presence: true
  validates :file_type, presence: true, inclusion: { in: %w[csv ofx qfx qbo] }
  validates :status, inclusion: { in: STATUSES }

  scope :active, -> { where.not(status: %w[completed failed]) }

  def advance_status!(new_status)
    update!(status: new_status)
  end

  def rows_by_classification
    import_session_rows.group(:classification).count
  end

  def rows_by_status
    import_session_rows.group(:status).count
  end
end
