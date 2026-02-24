class SmartSuggestionEvaluator
  RULES = [
    {
      key: "R1", block_key: "recurring_payments", priority: 10,
      reason: "You have several similar payments. Set them up as recurring to save time."
    },
    {
      key: "R2", block_key: "transfers", priority: 20,
      reason: "With multiple accounts, transfers can help you move money between them."
    },
    {
      key: "R3", block_key: "income_tracking", priority: 15,
      reason: "Track your income alongside your payments to see the full picture."
    },
    {
      key: "R4", block_key: "recurring_income", priority: 25,
      reason: "You have regular deposits. Set them up as recurring so they auto-generate."
    },
    {
      key: "R5", block_key: "buckets", priority: 20,
      reason: "Buckets let you split an account into savings goals."
    },
    {
      key: "R6", block_key: "reports", priority: 30,
      reason: "You have enough history for meaningful reports. See trends and breakdowns."
    },
    {
      key: "R8", block_key: "reconciliation", priority: 35,
      reason: "With this many transactions, reconciliation helps ensure your balance is correct."
    },
    {
      key: "R9", block_key: "smart_import", priority: 15,
      reason: "Import your bank statements to quickly catch up on transactions."
    },
  ].freeze

  def initialize(user)
    @user = user
    @active_keys = user.active_feature_block_keys
  end

  def evaluate
    RULES.each do |rule|
      next if @active_keys.include?(rule[:block_key])
      next if already_suggested?(rule[:key])
      next unless condition_met?(rule[:key])

      block = FeatureBlock.find_by(key: rule[:block_key])
      next unless block

      SmartSuggestion.create!(
        user: @user,
        feature_block: block,
        rule_key: rule[:key],
        reason_text: rule[:reason],
        priority: rule[:priority],
        status: "pending"
      )
    end
  end

  def top_suggestion
    @user.smart_suggestions
      .active
      .includes(:feature_block)
      .order(:priority)
      .first
  end

  private

  def already_suggested?(rule_key)
    @user.smart_suggestions.where(rule_key: rule_key).where(status: %w[pending shown accepted resolved]).exists? ||
      @user.smart_suggestions.where(rule_key: rule_key, status: "dismissed")
        .where("dismissed_at > ?", 7.days.ago).exists?
  end

  def condition_met?(rule_key)
    case rule_key
    when "R1"
      # 5+ payments with similar names
      return false unless @user.payments.count >= 5
      name_counts = @user.payments.group(:description).count
      name_counts.any? { |_, count| count >= 3 }
    when "R2"
      @user.accounts.count >= 3
    when "R3"
      @user.payments.exists? && !@user.income_entries.exists?
    when "R4"
      @active_keys.include?("income_tracking") && @user.income_entries.count >= 3
    when "R5"
      @user.accounts.where("balance > 0").count >= 2
    when "R6"
      @user.close_month_masters.count >= 3
    when "R8"
      @user.payments.count >= 50
    when "R9"
      @user.accounts.exists? && @user.payments.count == 0 && @user.created_at < 3.days.ago
    else
      false
    end
  end
end
