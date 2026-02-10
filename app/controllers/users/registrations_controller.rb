class Users::RegistrationsController < Devise::RegistrationsController
  before_action :configure_sign_up_params, only: [:create]
  before_action :configure_account_update_params, only: [:update]

  def new
    build_resource
    yield resource if block_given?
    respond_with resource
  end

  def create
    build_resource(sign_up_params)

    resource.save
    yield resource if block_given?

    if resource.persisted?
      if resource.active_for_authentication?
        set_flash_message! :notice, :signed_up
        sign_up(resource_name, resource)
        respond_with resource, location: after_sign_up_path_for(resource)
      else
        set_flash_message! :notice, :"signed_up_but_#{resource.inactive_message}"
        expire_data_after_sign_in!
        respond_with resource, location: after_inactive_sign_up_path_for(resource)
      end
    else
      clean_up_passwords resource
      set_minimum_password_length
      respond_with resource
    end
  end

  protected

  def configure_sign_up_params
    devise_parameter_sanitizer.permit(:sign_up, keys: [:first_name, :last_name, :phone_number])
  end

  def configure_account_update_params
    devise_parameter_sanitizer.permit(:account_update, keys: [:first_name, :last_name, :phone_number, :avatar_url, :secondary_email, :two_factor_enabled])
  end

  def update_resource(resource, params)
    # Only name fields changed — no password required
    if only_name_changes?(params)
      resource.update_without_password(params.except(:current_password))
    else
      super
    end
  end

  def after_update_path_for(resource)
    edit_user_registration_path
  end

  def after_sign_up_path_for(resource)
    dashboard_path
  end

  def after_inactive_sign_up_path_for(resource)
    new_user_session_path
  end

  private

  def only_name_changes?(params)
    params[:current_password].blank? &&
      params[:password].blank? &&
      params[:email] == resource.email &&
      params[:secondary_email].to_s == resource.secondary_email.to_s
  end
end
