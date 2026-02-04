# Create a test user
if Rails.env.development?
  User.find_or_create_by!(email: "test@example.com") do |user|
    user.password = "password123"
    user.first_name = "Test"
    user.last_name = "User"
  end
  puts "Test user created: test@example.com / password123"
end
