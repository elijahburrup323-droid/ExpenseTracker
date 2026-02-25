namespace :accounts do
  desc "Recalculate all account balances from beginning_balance + transactions (no multiplier)"
  task recalculate_balances: :environment do
    fixed = 0
    verified = 0

    User.find_each do |user|
      accounts = user.accounts.includes(:account_type_master)
      next if accounts.empty?

      computed = AccountBalanceService.balances_as_of(user, Date.today)

      accounts.each do |account|
        expected = (computed[account.id] || account.beginning_balance).to_f.round(2)
        actual = account.balance.to_f.round(2)

        if (expected - actual).abs > 0.005
          puts "FIX: User #{user.id} Account #{account.id} '#{account.name}' — stored=#{actual}, computed=#{expected}, diff=#{(expected - actual).round(2)}"
          account.update_column(:balance, expected)
          fixed += 1
        else
          verified += 1
        end
      end
    end

    puts "\nDone. Verified: #{verified}, Fixed: #{fixed}"
  end
end
