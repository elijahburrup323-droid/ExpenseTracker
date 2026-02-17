class AccountReconciliationController < ApplicationController
  before_action :authenticate_user!

  def index
    @accounts = current_user.accounts.ordered
    @open_month = OpenMonthMaster.for_user(current_user)
  end
end
