class SeedPerformanceGuardrailsReleaseNotes < ActiveRecord::Migration[7.1]
  def up
    today = "2026-02-26"
    entries = [
      ["Performance", "Added RecalculationSafetyService: wraps all recalculations with timing, logs warning and audit record when exceeding 5-second threshold (Instruction Set 3/4)"],
      ["Performance", "Financing term_months validation capped at 480 months (40 years) with descriptive error message (Instruction Set 3/4)"],
      ["Performance", "Investment holdings warn when transaction count exceeds 5,000 recommended maximum (Instruction Set 3/4)"],
      ["Performance", "FIFO recalculation is now bounded and forward-only — only processes affected transactions from trigger date (Instruction Set 3/4)"],
      ["Performance", "AmortizationService generates schedules in memory for preview, uses bulk insert for persistence, and recalculates forward from affected period only (Instruction Set 3/4)"],
      ["Performance", "Paginatable concern for API controllers: standardized offset/limit pagination with MAX_PER_PAGE=500 and sortable column allowlists (Instruction Set 3/4)"],
      ["Performance", "InvestmentHolding.with_computed_values scope computes market_value and unrealized_gain via SQL (no per-row Ruby loops) (Instruction Set 3/4)"],
    ]
    entries.each do |screen_name, description|
      execute <<~SQL.squish
        INSERT INTO bug_reports (screen_name, description, processed_date, created_at, updated_at)
        VALUES ('#{screen_name}', '#{description.gsub("'", "''")}', '#{today}', NOW(), NOW())
      SQL
    end
  end

  def down
    execute "DELETE FROM bug_reports WHERE processed_date = '2026-02-26' AND screen_name = 'Performance'"
  end
end
