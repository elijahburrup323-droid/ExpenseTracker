module FeatureGate
  extend ActiveSupport::Concern

  GLOBAL_FLAGS = {
    "assets"      => :FEATURE_ASSETS_ENABLED,
    "investments" => :FEATURE_INVESTMENTS_ENABLED,
    "financing"   => :FEATURE_FINANCING_ENABLED
  }.freeze

  private

  # Check global killswitch AND per-user feature activation.
  # Returns true if the module is available for the current user.
  def feature_enabled?(key)
    global_const = GLOBAL_FLAGS[key.to_s]
    return false if global_const && Object.const_defined?(global_const) && !Object.const_get(global_const)
    current_user.feature_active?(key)
  end

  # before_action guard — redirects HTML requests, returns 403 for API/JSON.
  def require_feature!(key)
    return if feature_enabled?(key)

    if request.format.json? || request.path.start_with?("/api")
      render json: { error: "This feature is not currently available." }, status: :forbidden
    else
      redirect_to dashboard_path, alert: "This feature is not currently available."
    end
  end
end
