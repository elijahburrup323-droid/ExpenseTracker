module FeatureBlockHelper
  def feature_block_active?(key)
    return true unless user_signed_in?
    current_user.feature_active?(key)
  end
end
