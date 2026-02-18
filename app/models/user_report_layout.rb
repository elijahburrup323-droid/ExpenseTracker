class UserReportLayout < ApplicationRecord
  belongs_to :user

  validates :slot_number, presence: true,
            numericality: { only_integer: true, in: 1..9 }
  validates :slot_number, uniqueness: { scope: :user_id }
  validates :report_key, presence: true, length: { maximum: 60 }
  validates :report_key, uniqueness: { scope: :user_id }

  REPORT_DEFINITIONS = [
    {
      report_key: "monthly_cash_flow",
      title: "Monthly Cash Flow",
      category: "Cash Flow",
      description: "Summary of monthly deposits and payments",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
    },
    {
      report_key: "spending_by_category",
      title: "Spending by Category",
      category: "Spending",
      description: "Breakdown of spending by category",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>'
    },
    {
      report_key: "spending_by_type",
      title: "Spending by Type",
      category: "Spending",
      description: "Analysis of fixed vs variable spending",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>'
    },
    {
      report_key: "income_by_source",
      title: "Income by Source",
      category: "Income",
      description: "Summary of income sources and amounts",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>'
    },
    {
      report_key: "account_balance_history",
      title: "Account Balance History",
      category: "Accounts",
      description: "Historical balances for each account",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>'
    },
    {
      report_key: "net_worth_report",
      title: "Net Worth Report",
      category: "Net Worth",
      description: "Overview of assets and liabilities net worth",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>'
    },
    {
      report_key: "recurring_obligations",
      title: "Recurring Obligations",
      category: "Recurring",
      description: "List of all recurring payments and deposits",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>'
    },
    {
      report_key: "reconciliation_summary",
      title: "Reconciliation Summary",
      category: "Reconciliation",
      description: "Status and history of all account reconciliations",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
    },
    {
      report_key: "soft_close_summary",
      title: "Soft Close Summary",
      category: "Month Close",
      description: "Summary of monthly soft close balances",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>'
    },
  ].freeze

  DEFINITIONS_BY_KEY = REPORT_DEFINITIONS.index_by { |d| d[:report_key] }.freeze

  def self.seed_defaults_for(user)
    return if where(user_id: user.id).exists?

    ActiveRecord::Base.transaction do
      REPORT_DEFINITIONS.each_with_index do |defn, idx|
        user.user_report_layouts.create!(
          slot_number: idx + 1,
          report_key: defn[:report_key]
        )
      end
    end
  end

  def definition
    DEFINITIONS_BY_KEY[report_key]
  end
end
