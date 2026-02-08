# Create a test user
if Rails.env.development?
  user = User.find_or_create_by!(email: "test@example.com") do |u|
    u.password = "password123"
    u.first_name = "Test"
    u.last_name = "User"
  end
  user.update!(budgethq_agent: true)
  puts "Test user created: test@example.com / password123 (agent: true)"
end

# Set BudgetHQ Agent flag for DJ and Elijah
User.where(first_name: %w[DJ Elijah]).update_all(budgethq_agent: true)

# Seed Income Frequency Masters
frequency_data = [
  # Standard frequencies (IDs 1-11)
  { id: 1, name: "Weekly", frequency_type: "standard", interval_days: 7, sort_order: 10 },
  { id: 2, name: "Bi-Weekly", frequency_type: "standard", interval_days: 14, sort_order: 20 },
  { id: 3, name: "Every 4 Weeks", frequency_type: "standard", interval_days: 28, sort_order: 30 },
  { id: 4, name: "Semi-Monthly", frequency_type: "standard", sort_order: 40 },
  { id: 5, name: "Monthly", frequency_type: "standard", sort_order: 50 },
  { id: 6, name: "Monthly (Variable Day)", frequency_type: "standard", sort_order: 55 },
  { id: 7, name: "Quarterly", frequency_type: "standard", sort_order: 60 },
  { id: 8, name: "Semi-Annual", frequency_type: "standard", sort_order: 70 },
  { id: 9, name: "Annual", frequency_type: "standard", sort_order: 80 },
  { id: 10, name: "One-Time", frequency_type: "standard", sort_order: 90 },
  { id: 11, name: "Irregular", frequency_type: "standard", sort_order: 100 },
  # Exact day frequencies (IDs 1001-1029)
  { id: 1001, name: "1st of Month", frequency_type: "exact_day", day_of_month: 1, sort_order: 2001 },
  { id: 1002, name: "2nd of Month", frequency_type: "exact_day", day_of_month: 2, sort_order: 2002 },
  { id: 1003, name: "3rd of Month", frequency_type: "exact_day", day_of_month: 3, sort_order: 2003 },
  { id: 1004, name: "4th of Month", frequency_type: "exact_day", day_of_month: 4, sort_order: 2004 },
  { id: 1005, name: "5th of Month", frequency_type: "exact_day", day_of_month: 5, sort_order: 2005 },
  { id: 1006, name: "6th of Month", frequency_type: "exact_day", day_of_month: 6, sort_order: 2006 },
  { id: 1007, name: "7th of Month", frequency_type: "exact_day", day_of_month: 7, sort_order: 2007 },
  { id: 1008, name: "8th of Month", frequency_type: "exact_day", day_of_month: 8, sort_order: 2008 },
  { id: 1009, name: "9th of Month", frequency_type: "exact_day", day_of_month: 9, sort_order: 2009 },
  { id: 1010, name: "10th of Month", frequency_type: "exact_day", day_of_month: 10, sort_order: 2010 },
  { id: 1011, name: "11th of Month", frequency_type: "exact_day", day_of_month: 11, sort_order: 2011 },
  { id: 1012, name: "12th of Month", frequency_type: "exact_day", day_of_month: 12, sort_order: 2012 },
  { id: 1013, name: "13th of Month", frequency_type: "exact_day", day_of_month: 13, sort_order: 2013 },
  { id: 1014, name: "14th of Month", frequency_type: "exact_day", day_of_month: 14, sort_order: 2014 },
  { id: 1015, name: "15th of Month", frequency_type: "exact_day", day_of_month: 15, sort_order: 2015 },
  { id: 1016, name: "16th of Month", frequency_type: "exact_day", day_of_month: 16, sort_order: 2016 },
  { id: 1017, name: "17th of Month", frequency_type: "exact_day", day_of_month: 17, sort_order: 2017 },
  { id: 1018, name: "18th of Month", frequency_type: "exact_day", day_of_month: 18, sort_order: 2018 },
  { id: 1019, name: "19th of Month", frequency_type: "exact_day", day_of_month: 19, sort_order: 2019 },
  { id: 1020, name: "20th of Month", frequency_type: "exact_day", day_of_month: 20, sort_order: 2020 },
  { id: 1021, name: "21st of Month", frequency_type: "exact_day", day_of_month: 21, sort_order: 2021 },
  { id: 1022, name: "22nd of Month", frequency_type: "exact_day", day_of_month: 22, sort_order: 2022 },
  { id: 1023, name: "23rd of Month", frequency_type: "exact_day", day_of_month: 23, sort_order: 2023 },
  { id: 1024, name: "24th of Month", frequency_type: "exact_day", day_of_month: 24, sort_order: 2024 },
  { id: 1025, name: "25th of Month", frequency_type: "exact_day", day_of_month: 25, sort_order: 2025 },
  { id: 1026, name: "26th of Month", frequency_type: "exact_day", day_of_month: 26, sort_order: 2026 },
  { id: 1027, name: "27th of Month", frequency_type: "exact_day", day_of_month: 27, sort_order: 2027 },
  { id: 1028, name: "28th of Month", frequency_type: "exact_day", day_of_month: 28, sort_order: 2028 },
  { id: 1029, name: "Last Day of Month", frequency_type: "exact_day", is_last_day: true, sort_order: 2029 },
  # Ordinal weekday frequencies (IDs 2001-2020)
  { id: 2001, name: "1st Monday", frequency_type: "ordinal_weekday", weekday: 1, ordinal: 1, sort_order: 3001 },
  { id: 2002, name: "1st Tuesday", frequency_type: "ordinal_weekday", weekday: 2, ordinal: 1, sort_order: 3002 },
  { id: 2003, name: "1st Wednesday", frequency_type: "ordinal_weekday", weekday: 3, ordinal: 1, sort_order: 3003 },
  { id: 2004, name: "1st Thursday", frequency_type: "ordinal_weekday", weekday: 4, ordinal: 1, sort_order: 3004 },
  { id: 2005, name: "1st Friday", frequency_type: "ordinal_weekday", weekday: 5, ordinal: 1, sort_order: 3005 },
  { id: 2006, name: "2nd Monday", frequency_type: "ordinal_weekday", weekday: 1, ordinal: 2, sort_order: 3006 },
  { id: 2007, name: "2nd Tuesday", frequency_type: "ordinal_weekday", weekday: 2, ordinal: 2, sort_order: 3007 },
  { id: 2008, name: "2nd Wednesday", frequency_type: "ordinal_weekday", weekday: 3, ordinal: 2, sort_order: 3008 },
  { id: 2009, name: "2nd Thursday", frequency_type: "ordinal_weekday", weekday: 4, ordinal: 2, sort_order: 3009 },
  { id: 2010, name: "2nd Friday", frequency_type: "ordinal_weekday", weekday: 5, ordinal: 2, sort_order: 3010 },
  { id: 2011, name: "3rd Monday", frequency_type: "ordinal_weekday", weekday: 1, ordinal: 3, sort_order: 3011 },
  { id: 2012, name: "3rd Tuesday", frequency_type: "ordinal_weekday", weekday: 2, ordinal: 3, sort_order: 3012 },
  { id: 2013, name: "3rd Wednesday", frequency_type: "ordinal_weekday", weekday: 3, ordinal: 3, sort_order: 3013 },
  { id: 2014, name: "3rd Thursday", frequency_type: "ordinal_weekday", weekday: 4, ordinal: 3, sort_order: 3014 },
  { id: 2015, name: "3rd Friday", frequency_type: "ordinal_weekday", weekday: 5, ordinal: 3, sort_order: 3015 },
  { id: 2016, name: "4th Monday", frequency_type: "ordinal_weekday", weekday: 1, ordinal: 4, sort_order: 3016 },
  { id: 2017, name: "4th Tuesday", frequency_type: "ordinal_weekday", weekday: 2, ordinal: 4, sort_order: 3017 },
  { id: 2018, name: "4th Wednesday", frequency_type: "ordinal_weekday", weekday: 3, ordinal: 4, sort_order: 3018 },
  { id: 2019, name: "4th Thursday", frequency_type: "ordinal_weekday", weekday: 4, ordinal: 4, sort_order: 3019 },
  { id: 2020, name: "4th Friday", frequency_type: "ordinal_weekday", weekday: 5, ordinal: 4, sort_order: 3020 },
]

frequency_data.each do |attrs|
  IncomeFrequencyMaster.find_or_create_by!(id: attrs[:id]) do |freq|
    freq.name = attrs[:name]
    freq.frequency_type = attrs[:frequency_type]
    freq.interval_days = attrs[:interval_days]
    freq.day_of_month = attrs[:day_of_month]
    freq.is_last_day = attrs[:is_last_day] || false
    freq.weekday = attrs[:weekday]
    freq.ordinal = attrs[:ordinal]
    freq.sort_order = attrs[:sort_order]
    freq.active = true
  end
end

# Reset the sequence so new records don't conflict with seeded IDs
if ActiveRecord::Base.connection.adapter_name == "PostgreSQL"
  ActiveRecord::Base.connection.execute(
    "SELECT setval('income_frequency_masters_id_seq', (SELECT MAX(id) FROM income_frequency_masters))"
  )
end

puts "Seeded #{IncomeFrequencyMaster.count} income frequency masters"
