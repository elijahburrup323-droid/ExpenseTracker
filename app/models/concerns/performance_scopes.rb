module PerformanceScopes
  extend ActiveSupport::Concern

  class_methods do
    # Optimized aggregate computation via SQL (no per-row Ruby loops).
    # Usage: InvestmentHolding.aggregated_market_values(user_id)
    # Returns { holding_id => { shares_held:, cost_basis:, market_value: } }
    def aggregated_values(user_id)
      raise NotImplementedError, "Subclass must implement .aggregated_values"
    end
  end
end
