class AssetValuationService
  # Add a new valuation entry for an asset and auto-update current_value.
  #
  # Returns the created AssetValuation record.
  # Raises ActiveRecord::RecordInvalid on validation failure.
  def self.add_valuation!(asset, valuation_date:, value:, source: "manual", notes: nil)
    valuation = nil

    ActiveRecord::Base.transaction do
      valuation = asset.asset_valuations.create!(
        valuation_date: valuation_date,
        value: value,
        source: source,
        notes: notes
      )

      # Update asset's current_value to the most recent valuation
      latest = asset.asset_valuations
                    .reverse_chronological
                    .first

      if latest
        asset.update_columns(current_value: latest.value, updated_at: Time.current)
      end
    end

    valuation
  end
end
