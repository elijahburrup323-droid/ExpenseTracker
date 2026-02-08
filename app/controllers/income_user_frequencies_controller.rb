class IncomeUserFrequenciesController < ApplicationController
  before_action :authenticate_user!
  before_action :seed_defaults

  def index
  end

  private

  def seed_defaults
    IncomeUserFrequency.seed_defaults_for(current_user)
  end
end
