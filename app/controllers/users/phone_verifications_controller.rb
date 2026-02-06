class Users::PhoneVerificationsController < ApplicationController
  def new
  end

  def create
    phone_number = params[:phone_number]

    unless Phonelib.valid?(phone_number)
      flash.now[:alert] = "Please enter a valid phone number"
      render :new, status: :unprocessable_entity
      return
    end

    verification = PhoneVerification.generate_for(phone_number)

    if verification
      session[:phone_verification_id] = verification.id
      redirect_to verify_users_phone_verifications_path
    else
      flash.now[:alert] = "Could not send verification code. Please try again."
      render :new, status: :unprocessable_entity
    end
  end

  def verify
    @verification = PhoneVerification.find_by(id: session[:phone_verification_id])

    unless @verification && !@verification.expired?
      flash[:alert] = "Verification session expired. Please try again."
      redirect_to new_users_phone_verification_path
      return
    end
  end

  def confirm
    @verification = PhoneVerification.find_by(id: session[:phone_verification_id])

    unless @verification
      flash[:alert] = "Verification session expired. Please try again."
      redirect_to new_users_phone_verification_path
      return
    end

    if @verification.verify!(params[:code])
      user = User.find_or_create_by_phone(@verification.phone_number)
      session.delete(:phone_verification_id)
      sign_in(user)
      flash[:notice] = "Successfully signed in with phone number"
      redirect_to dashboard_path
    else
      if @verification.expired?
        flash[:alert] = "Verification code expired. Please request a new one."
        redirect_to new_users_phone_verification_path
      else
        flash.now[:alert] = "Invalid verification code. Please try again."
        render :verify, status: :unprocessable_entity
      end
    end
  end
end
