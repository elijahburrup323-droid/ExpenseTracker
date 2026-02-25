namespace :accounts do
  desc "Recalculate all account balances from beginning_balance + transactions"
  task recalculate_balances: :environment do
    verified = 0
    fixed = 0

    User.find_each do |user|
      computed = AccountBalanceService.balances_as_of(user, Date.today)
      user.accounts.find_each do |account|
        expected = computed[account.id] || account.beginning_balance.to_f
        stored = account.balance.to_f
        diff = (expected - stored).round(2)
        if diff.abs > 0.005
          puts "FIX: User #{user.id} Account #{account.id} '#{account.name}' — stored=#{stored}, computed=#{expected}, diff=#{diff}"
          account.update_column(:balance, expected)
          fixed += 1
        else
          verified += 1
        end
      end
    end

    puts "Done. Verified: #{verified}, Fixed: #{fixed}"
  end
end
