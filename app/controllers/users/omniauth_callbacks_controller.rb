class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  skip_before_action :verify_authenticity_token, only: [:apple, :google_oauth2, :microsoft_graph]

  def google_oauth2
    handle_oauth("Google")
  end

  def apple
    handle_oauth("Apple")
  end

  def microsoft_graph
    handle_oauth("Microsoft")
  end

  def failure
    flash[:alert] = "Authentication failed: #{failure_message}"
    redirect_to new_user_session_path
  end

  private

  def handle_oauth(provider)
    @user = User.from_omniauth(request.env["omniauth.auth"])

    if @user.persisted?
      flash[:notice] = I18n.t("devise.omniauth_callbacks.success", kind: provider)
      sign_in_and_redirect @user, event: :authentication
    else
      session["devise.oauth_data"] = request.env["omniauth.auth"].except(:extra)
      flash[:alert] = "Could not authenticate with #{provider}. Please try again."
      redirect_to new_user_registration_url
    end
  end

  def failure_message
    error = request.env["omniauth.error"]
    error_type = request.env["omniauth.error.type"]

    case error_type
    when :invalid_credentials
      "Invalid credentials"
    when :access_denied
      "Access denied"
    else
      error&.message || "Unknown error"
    end
  end
end
