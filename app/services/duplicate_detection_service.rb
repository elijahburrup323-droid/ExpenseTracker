class DuplicateDetectionService
  # Detects duplicate transactions by comparing import session rows
  # against existing records in the database.
  #
  # Algorithm:
  # 1. For each import row, generate a duplicate key (date + abs(amount) + normalized description)
  # 2. Check against existing payments/income_entries/transfer_masters for same account
  # 3. Mark matching rows as status: 'duplicate'
  def initialize(import_session)
    @session = import_session
    @user = import_session.user
    @account = import_session.account
  end

  def detect!
    rows = @session.import_session_rows.where.not(classification: "skip")
    return 0 if rows.empty?

    existing = preload_existing_records
    duplicate_count = 0

    rows.each do |row|
      date_str = row.mapped_data["date"].to_s
      amount = row.mapped_data["amount"].to_f.abs
      desc = normalize(row.mapped_data["description"])

      # Generate and store the duplicate key
      key = generate_key(date_str, amount, desc)
      row.update_columns(duplicate_key: key)

      is_dup = case row.classification
               when "payment"
                 existing[:payments].any? { |p| match?(p, date_str, amount, desc) }
               when "deposit"
                 existing[:income_entries].any? { |i| match?(i, date_str, amount, desc) }
               when "transfer"
                 existing[:transfers].any? { |t| match?(t, date_str, amount, desc) }
               else
                 false
               end

      if is_dup
        row.update_columns(status: "duplicate")
        duplicate_count += 1
      end
    end

    @session.update_columns(duplicate_count: duplicate_count)
    duplicate_count
  end

  private

  def generate_key(date_str, amount, normalized_desc)
    Digest::SHA256.hexdigest("#{date_str}|#{amount}|#{normalized_desc}")
  end

  def normalize(str)
    str.to_s.downcase.gsub(/[^a-z0-9]/, "")[0..30]
  end

  def match?(existing_record, date_str, amount, desc)
    existing_record[:date].to_s == date_str &&
      (existing_record[:amount] - amount).abs < 0.01 &&
      similar?(existing_record[:desc], desc)
  end

  def similar?(a, b)
    return true if a == b
    return false if a.blank? || b.blank?
    # Substring match: if one starts with the other (first 15 chars)
    short_a = a[0..14]
    short_b = b[0..14]
    short_a.start_with?(short_b) || short_b.start_with?(short_a)
  end

  def preload_existing_records
    # Look at records within a reasonable date window
    date_strings = @session.import_session_rows.pluck(Arel.sql("mapped_data->>'date'")).compact
    return { payments: [], income_entries: [], transfers: [] } if date_strings.empty?

    dates = date_strings.filter_map { |d| Date.parse(d) rescue nil }
    return { payments: [], income_entries: [], transfers: [] } if dates.empty?

    min_date = dates.min - 3.days
    max_date = dates.max + 3.days

    payments = @user.payments
      .where(account_id: @account.id)
      .where(payment_date: min_date..max_date)
      .pluck(:payment_date, :amount, :description)
      .map { |d, a, desc| { date: d.to_s, amount: a.to_f.abs, desc: normalize(desc) } }

    income_entries = @user.income_entries
      .where(account_id: @account.id)
      .where(entry_date: min_date..max_date)
      .pluck(:entry_date, :amount, :source_name)
      .map { |d, a, desc| { date: d.to_s, amount: a.to_f.abs, desc: normalize(desc) } }

    transfers = @user.transfer_masters
      .where(from_account_id: @account.id)
      .where(transfer_date: min_date..max_date)
      .pluck(:transfer_date, :amount, :memo)
      .map { |d, a, desc| { date: d.to_s, amount: a.to_f.abs, desc: normalize(desc) } }

    { payments: payments, income_entries: income_entries, transfers: transfers }
  end
end
