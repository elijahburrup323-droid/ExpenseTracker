namespace :transactions do
  desc "Run parity validation comparing legacy tables vs transactions table"
  task parity: :environment do
    # Find test users: Jaci and DJ
    test_emails = ["jacismith@home.net", "djburrup@gmail.com"]
    users = User.where(email: test_emails)

    if users.empty?
      puts "No test users found. Provide user IDs via USERS env var."
      exit 1
    end

    all_passed = true

    users.each do |user|
      puts "\n#{'=' * 60}"
      puts "Validating: #{user.email} (ID: #{user.id})"
      puts '=' * 60

      validator = TransactionParityValidator.new(user)
      validator.validate_all!

      validator.results.each do |r|
        icon = r[:status] == :pass ? "PASS" : "FAIL"
        line = "  [#{icon}] #{r[:group]} — #{r[:detail]}"
        line += " | legacy=#{r[:legacy]} txn=#{r[:txn]} delta=#{r[:delta]}" if r[:status] == :fail
        puts line
      end

      puts "\n  Summary: #{validator.summary}"
      all_passed = false unless validator.passed?
    end

    puts "\n#{'=' * 60}"
    if all_passed
      puts "STOP/GO GATE: GO — All parity checks passed."
    else
      puts "STOP/GO GATE: STOP — Parity failures detected. Fix before proceeding."
    end
  end
end
