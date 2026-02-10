class DocumentationController < ApplicationController
  before_action :authenticate_user!

  def index
  end

  def database_schema
  end

  def database_visualization
  end

  def release_notes
  end

  def claude_prompt
  end
end
