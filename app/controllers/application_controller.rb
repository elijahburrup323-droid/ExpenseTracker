class ApplicationController < ActionController::Base
  before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :load_daily_quote
  before_action :load_open_month_display

  protected

  def load_daily_quote
    return unless user_signed_in?
    version = Quote.cache_version
    if session[:daily_quote].blank? || session[:daily_quote_date] != Date.today.to_s || session[:daily_quote_version] != version
      quote = Quote.random_active
      if quote
        text = "\u201C#{quote.quote_text}\u201D"
        text += " \u2014 #{quote.quote_author}" if quote.quote_author.present?
        session[:daily_quote] = text
      else
        session[:daily_quote] = "\u201CA budget is telling your money where to go instead of wondering where it went.\u201D"
      end
      session[:daily_quote_date] = Date.today.to_s
      session[:daily_quote_version] = version
    end
    @daily_quote = session[:daily_quote]
  rescue ActiveRecord::StatementInvalid
    @daily_quote = "\u201CA budget is telling your money where to go instead of wondering where it went.\u201D"
  end

  def load_open_month_display
    return unless user_signed_in?
    om = OpenMonthMaster.for_user(current_user)
    @open_month_display = Date.new(om.current_year, om.current_month, 1).strftime("%B, %Y")
  rescue
    @open_month_display = Date.today.strftime("%B, %Y")
  end

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:first_name, :last_name, :phone_number])
    devise_parameter_sanitizer.permit(:account_update, keys: [:first_name, :last_name, :phone_number, :avatar_url, :secondary_email])
  end

  def after_sign_in_path_for(resource)
    stored_location_for(resource) || dashboard_path
  end

  def after_sign_out_path_for(_resource_or_scope)
    root_path
  end
end
