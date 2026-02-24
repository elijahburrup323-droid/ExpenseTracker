class ImportExecutorService
  # Creates actual Payment/IncomeEntry/TransferMaster records from
  # classified and assigned import session rows.
  #
  # Each row is wrapped in its own transaction to isolate errors.
  # Balance adjustments replicate the logic from the existing API controllers.
  def initialize(import_session)
    @session = import_session
    @user = import_session.user
    @account = import_session.account
  end

  def execute!
    @session.update!(status: "importing", started_at: Time.current)

    rows = @session.import_session_rows.importable.where.not(status: "duplicate")
    imported = 0
    errors = 0
    skipped = @session.import_session_rows.where(classification: "skip").count +
              @session.import_session_rows.where(status: "duplicate").count

    rows.find_each do |row|
      begin
        ActiveRecord::Base.transaction do
          case row.classification
          when "payment"  then create_payment(row)
          when "deposit"  then create_income_entry(row)
          when "transfer" then create_transfer(row)
          end
          row.update!(status: "imported")
          imported += 1
        end
      rescue => e
        row.update!(status: "error", error_message: e.message.truncate(500))
        errors += 1
      end
    end

    @session.update!(
      status: errors > 0 && imported == 0 ? "failed" : "completed",
      imported_count: imported,
      skipped_count: skipped,
      error_count: errors,
      completed_at: Time.current
    )

    { imported: imported, skipped: skipped, errors: errors }
  end

  private

  def create_payment(row)
    data = (row.assigned_data || {}).symbolize_keys
    mapped = row.mapped_data || {}
    date = parse_date(mapped["date"])
    amount = mapped["amount"].to_d.abs

    payment = @user.payments.create!(
      account: @account,
      spending_category_id: data[:spending_category_id],
      payment_date: date,
      description: mapped["description"].to_s.truncate(255),
      amount: amount,
      notes: "Imported via Smart Import"
    )

    # Adjust account balance (matches payments_controller.rb line 39)
    @account.reload
    @account.balance -= payment.amount
    @account.save!

    flag_open_month(date, "payment")
    row.update!(created_record_type: "Payment", created_record_id: payment.id)
  end

  def create_income_entry(row)
    data = (row.assigned_data || {}).symbolize_keys
    mapped = row.mapped_data || {}
    date = parse_date(mapped["date"])
    amount = mapped["amount"].to_d.abs

    entry = @user.income_entries.create!(
      account: @account,
      source_name: (data[:source_name].presence || mapped["description"]).to_s.truncate(80),
      description: mapped["description"].to_s.truncate(255),
      entry_date: date,
      amount: amount,
      received_flag: true
    )

    # Adjust account balance (matches income_entries_controller.rb line 19)
    @account.reload
    @account.balance += entry.amount
    @account.save!

    flag_open_month(date, "deposit")
    row.update!(created_record_type: "IncomeEntry", created_record_id: entry.id)
  end

  def create_transfer(row)
    data = (row.assigned_data || {}).symbolize_keys
    mapped = row.mapped_data || {}
    date = parse_date(mapped["date"])
    amount = mapped["amount"].to_d.abs

    to_account = @user.accounts.find(data[:to_account_id])

    transfer = @user.transfer_masters.create!(
      from_account: @account,
      to_account: to_account,
      transfer_date: date,
      amount: amount,
      memo: mapped["description"].to_s.truncate(255)
    )

    # Adjust account balances for inter-account transfers
    # (matches transfer_masters_controller.rb lines 33-41)
    unless @account.id == to_account.id
      @account.reload
      @account.balance -= transfer.amount
      @account.save!

      to_account.reload
      to_account.balance += transfer.amount
      to_account.save!
    end

    flag_open_month(date, "transfer")
    row.update!(created_record_type: "TransferMaster", created_record_id: transfer.id)
  end

  def parse_date(raw)
    return Date.today if raw.blank?
    Date.parse(raw.to_s)
  rescue
    Date.today
  end

  def flag_open_month(record_date, source)
    om = OpenMonthMaster.for_user(@user)
    if record_date.year == om.current_year && record_date.month == om.current_month
      om.mark_has_data!(source)
    end
  rescue => e
    Rails.logger.warn("ImportExecutor flag_open_month error: #{e.message}")
  end
end
