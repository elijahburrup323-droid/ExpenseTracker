module Api
  class ImportSessionsController < BaseController
    before_action :set_session, only: [:show, :map_columns, :classify, :assign, :execute, :duplicates]

    # POST /api/import_sessions
    # Creates an import session with parsed rows.
    # For CSV: client parses and sends { account_id, file_name, file_type, headers: [...], rows: [[...], ...] }
    # For OFX/QFX/QBO: client sends file upload via multipart form
    def create
      account = current_user.accounts.find_by(id: params[:account_id])
      return render json: { errors: ["Account not found"] }, status: :unprocessable_entity unless account

      file_type = params[:file_type].to_s.downcase
      unless %w[csv ofx qfx qbo].include?(file_type)
        return render json: { errors: ["Unsupported file type: #{file_type}"] }, status: :unprocessable_entity
      end

      session = current_user.import_sessions.build(
        account: account,
        file_name: params[:file_name].to_s.truncate(255),
        file_type: file_type,
        status: "parsing"
      )

      ActiveRecord::Base.transaction do
        session.save!

        if file_type == "csv"
          create_csv_rows(session)
        else
          create_ofx_rows(session, file_type)
        end

        session.update!(row_count: session.import_session_rows.count, status: "mapping")
      end

      render json: session_json(session), status: :created
    rescue => e
      render json: { errors: [e.message] }, status: :unprocessable_entity
    end

    # GET /api/import_sessions/:id
    def show
      page = (params[:page] || 1).to_i
      per_page = (params[:per_page] || 50).to_i

      rows = @session.import_session_rows.order(:row_number)
      total = rows.count
      rows = rows.offset((page - 1) * per_page).limit(per_page)

      render json: session_json(@session).merge(
        rows: rows.map { |r| row_json(r) },
        pagination: { page: page, per_page: per_page, total: total, total_pages: (total.to_f / per_page).ceil }
      )
    end

    # PATCH /api/import_sessions/:id/map_columns
    # Saves column mapping and applies it to all rows.
    # Params: { column_mapping: { "0": "date", "1": "description", ... },
    #           date_format: "MM/DD/YYYY", amount_convention: "negative_expense" }
    def map_columns
      mapping = params[:column_mapping]&.to_unsafe_h || {}
      date_format = params[:date_format].to_s
      amount_convention = params[:amount_convention].to_s

      @session.update!(
        column_mapping: mapping,
        detected_date_format: date_format,
        detected_amount_convention: amount_convention,
        status: "classifying"
      )

      # Apply mapping to all rows
      @session.import_session_rows.find_each do |row|
        raw = row.raw_data
        mapped = {}

        mapping.each do |col_idx, field_key|
          next if field_key == "skip" || field_key.blank?
          value = raw.is_a?(Hash) ? (raw[col_idx.to_s] || raw[col_idx.to_i.to_s]) : nil
          mapped[field_key] = value
        end

        # Normalize amount based on convention
        if mapped["amount"].present?
          amt = mapped["amount"].to_s.gsub(/[^0-9.\-]/, "").to_f
          mapped["amount"] = amt
        end

        # Normalize date
        if mapped["date"].present?
          mapped["date"] = normalize_date(mapped["date"], date_format)
        end

        row.update!(mapped_data: mapped)
      end

      render json: session_json(@session)
    end

    # PATCH /api/import_sessions/:id/classify
    # Bulk update classifications for rows.
    # Params: { classifications: { "row_id": "payment", "row_id": "deposit", ... } }
    def classify
      classifications = params[:classifications]&.to_unsafe_h || {}

      ActiveRecord::Base.transaction do
        classifications.each do |row_id, classification|
          row = @session.import_session_rows.find_by(id: row_id)
          row&.update!(classification: classification)
        end

        @session.update!(status: "assigning")
      end

      counts = @session.rows_by_classification
      render json: session_json(@session).merge(classification_counts: counts)
    end

    # PATCH /api/import_sessions/:id/assign
    # Bulk update assigned_data for rows.
    # Params: { assignments: { "row_id": { spending_category_id: 1 }, ... } }
    def assign
      assignments = params[:assignments]&.to_unsafe_h || {}

      ActiveRecord::Base.transaction do
        assignments.each do |row_id, data|
          row = @session.import_session_rows.find_by(id: row_id)
          row&.update!(assigned_data: data.to_h)
        end

        @session.update!(status: "ready")
      end

      render json: session_json(@session)
    end

    # POST /api/import_sessions/:id/execute
    # Actually create Payment/IncomeEntry/TransferMaster records.
    def execute
      result = ImportExecutorService.new(@session).execute!
      @session.reload

      render json: session_json(@session).merge(
        result: result
      )
    end

    # GET /api/import_sessions/:id/duplicates
    # Run duplicate detection against existing records.
    def duplicates
      count = DuplicateDetectionService.new(@session).detect!
      @session.reload

      duplicate_rows = @session.import_session_rows.where(status: "duplicate").map { |r| row_json(r) }
      render json: { duplicate_count: count, duplicates: duplicate_rows }
    end

    private

    def set_session
      @session = current_user.import_sessions.find_by(id: params[:id])
      render_not_found unless @session
    end

    def create_csv_rows(session)
      headers = params[:headers] || []
      rows = params[:rows] || []

      rows.each_with_index do |row_data, idx|
        raw = {}
        headers.each_with_index do |_header, col_idx|
          raw[col_idx.to_s] = row_data[col_idx].to_s
        end

        session.import_session_rows.create!(
          row_number: idx + 1,
          raw_data: raw
        )
      end
    end

    def create_ofx_rows(session, file_type)
      file_content = params[:file_content].to_s
      if file_content.blank? && params[:file].present?
        file_content = params[:file].read
      end

      return if file_content.blank?

      transactions = OfxParserService.parse(file_content)
      transactions.each_with_index do |txn, idx|
        session.import_session_rows.create!(
          row_number: idx + 1,
          raw_data: txn.stringify_keys,
          mapped_data: {
            "date" => txn[:date],
            "amount" => txn[:amount],
            "description" => txn[:description],
            "memo" => txn[:memo]
          }
        )
      end
    end

    def normalize_date(raw, format)
      return raw if raw.blank?

      case format
      when "MM/DD/YYYY"
        parts = raw.split("/")
        return raw unless parts.length == 3
        "#{parts[2]}-#{parts[0].rjust(2, '0')}-#{parts[1].rjust(2, '0')}"
      when "DD/MM/YYYY"
        parts = raw.split("/")
        return raw unless parts.length == 3
        "#{parts[2]}-#{parts[1].rjust(2, '0')}-#{parts[0].rjust(2, '0')}"
      when "YYYY-MM-DD"
        raw # Already in ISO format
      when "MM/DD/YY"
        parts = raw.split("/")
        return raw unless parts.length == 3
        year = parts[2].to_i
        year += year < 50 ? 2000 : 1900
        "#{year}-#{parts[0].rjust(2, '0')}-#{parts[1].rjust(2, '0')}"
      when "YYYYMMDD"
        return raw unless raw.length == 8
        "#{raw[0..3]}-#{raw[4..5]}-#{raw[6..7]}"
      else
        # Try to parse automatically
        Date.parse(raw).to_s rescue raw
      end
    end

    def session_json(session)
      {
        id: session.id,
        account_id: session.account_id,
        file_name: session.file_name,
        file_type: session.file_type,
        status: session.status,
        row_count: session.row_count,
        imported_count: session.imported_count,
        skipped_count: session.skipped_count,
        duplicate_count: session.duplicate_count,
        error_count: session.error_count,
        column_mapping: session.column_mapping,
        detected_date_format: session.detected_date_format,
        detected_amount_convention: session.detected_amount_convention,
        classification_counts: session.rows_by_classification,
        started_at: session.started_at,
        completed_at: session.completed_at
      }
    end

    def row_json(row)
      {
        id: row.id,
        row_number: row.row_number,
        raw_data: row.raw_data,
        mapped_data: row.mapped_data,
        classification: row.classification,
        assigned_data: row.assigned_data,
        status: row.status,
        error_message: row.error_message,
        created_record_type: row.created_record_type,
        created_record_id: row.created_record_id
      }
    end
  end
end
