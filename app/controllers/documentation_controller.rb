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

  def architecture_overview
  end

  def deployment_runbook
  end

  def test_coverage
    @test_files = scan_test_files
  end

  def environment_variables
  end

  private

  def scan_test_files
    test_dir = Rails.root.join("tests")
    return [] unless test_dir.exist?

    Dir.glob(test_dir.join("*.spec.js")).map do |file_path|
      file_name = File.basename(file_path)
      content = File.read(file_path)
      tests = content.scan(/test\(\s*["'](.+?)["']/).flatten
      describes = content.scan(/test\.describe\(\s*["'](.+?)["']/).flatten
      is_prod = file_name.start_with?("prod-")
      {
        name: file_name,
        suite: describes.first || file_name.sub(".spec.js", "").tr("-", " ").capitalize,
        test_count: tests.length,
        tests: tests,
        production: is_prod,
        size: File.size(file_path)
      }
    end.sort_by { |f| f[:name] }
  end
end
