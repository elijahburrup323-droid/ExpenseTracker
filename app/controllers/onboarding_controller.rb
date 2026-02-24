class OnboardingController < ApplicationController
  before_action :authenticate_user!
  layout "onboarding"

  def show
    profile = current_user.onboarding_profile || current_user.create_onboarding_profile(wizard_step: 1)
    redirect_to dashboard_path if profile.completed?
    @step = profile.wizard_step || 1
    @user = current_user
  end

  def update
    profile = current_user.onboarding_profile || current_user.create_onboarding_profile(wizard_step: 1)
    step = (params[:step] || profile.wizard_step || 1).to_i

    case step
    when 1
      current_user.update(first_name: params[:first_name], last_name: params[:last_name])
      profile.update!(wizard_step: 2)
    when 2
      profile.update!(persona: params[:persona], wizard_step: 3)
    when 3
      # Ensure user has at least one account type (new users may not have any yet)
      default_type = current_user.account_types.first
      unless default_type
        default_type = current_user.account_types.create!(
          name: "Checking",
          description: "General checking account",
          is_active: true,
          sort_order: 1
        )
      end

      # Use selected account type master or fall back to the default legacy type
      account_type = default_type
      if params[:account_type_id].present?
        atm = AccountTypeMaster.find_by(id: params[:account_type_id])
        if atm
          # Find or create legacy account type for this master
          account_type = current_user.account_types.find_or_create_by!(name: atm.display_name) do |at|
            at.description = atm.description
            at.is_active = true
            at.sort_order = (current_user.account_types.maximum(:sort_order) || 0) + 1
          end
        end
      end

      account = current_user.accounts.create!(
        name: params[:account_name],
        balance: params[:balance].to_f,
        beginning_balance: params[:balance].to_f,
        include_in_budget: true,
        account_type_id: account_type.id,
        account_type_master_id: params[:account_type_id].presence&.to_i
      )
      profile.update!(first_account_id: account.id, wizard_step: 4)
    when 4
      # Activate persona blocks
      block_keys = profile.blocks_for_persona
      blocks = FeatureBlock.where(key: block_keys)
      blocks.each do |block|
        UserFeatureActivation.find_or_create_by!(user_id: current_user.id, feature_block_id: block.id) do |a|
          a.activated_at = Time.current
        end
      end
      # Also ensure core blocks are activated
      FeatureBlock.core.each do |block|
        UserFeatureActivation.find_or_create_by!(user_id: current_user.id, feature_block_id: block.id) do |a|
          a.activated_at = Time.current
        end
      end
      profile.update!(wizard_completed_at: Time.current, wizard_step: nil)
      redirect_to dashboard_path and return
    end

    redirect_to onboarding_path
  end
end
