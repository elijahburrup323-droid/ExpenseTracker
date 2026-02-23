class LegacyUrlRedirect
  def initialize(app)
    @app = app
  end

  def call(env)
    path = env["PATH_INFO"]
    if path =~ %r{\A/expensetracker(/.*)?}
      new_path = "/mybudgethq#{$1}"
      qs = env["QUERY_STRING"]
      location = qs.empty? ? new_path : "#{new_path}?#{qs}"
      [301, { "Location" => location, "Content-Type" => "text/html" }, ["Moved permanently"]]
    else
      @app.call(env)
    end
  end
end
