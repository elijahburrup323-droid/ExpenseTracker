class FinancingController < ApplicationController
  include FeatureGate
  before_action :authenticate_user!
  before_action -> { require_feature!("financing") }

  def loans_notes
  end

  def contracts_for_deed
  end

  def show
    @instrument = current_user.financing_instruments.find_by(id: params[:id])
    redirect_to financing_loans_notes_path, alert: "Instrument not found" unless @instrument
  end
end
