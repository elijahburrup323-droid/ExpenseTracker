require_relative "config/environment"

# Redirect legacy /expensetracker URLs at the Rack level (before map),
# so it works even when the app is mounted at a subpath like /mybudgethq.
url_root = Rails.application.config.relative_url_root
if url_root.present?
  map "/expensetracker" do
    run ->(env) {
      path = env["PATH_INFO"]
      qs = env["QUERY_STRING"]
      location = "#{url_root}#{path}"
      location = "#{location}?#{qs}" unless qs.empty?
      [301, { "Location" => location, "Content-Type" => "text/html" }, ["Moved permanently"]]
    }
  end
end

map url_root || "/" do
  run Rails.application
end
