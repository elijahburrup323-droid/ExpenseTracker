# MyBudgetHQ

A personal finance and budget tracking web application built with Ruby on Rails.

## Features

- Email/password registration and login
- Google OAuth sign-in
- Apple sign-in
- Microsoft OAuth sign-in
- Phone number authentication (SMS via Twilio)
- Remember me functionality
- Password reset flow
- Clean, modern UI with Tailwind CSS
- Hotwire (Turbo + Stimulus) for interactivity

## Requirements

- Ruby 3.2.2
- Rails 7.1+
- PostgreSQL
- Node.js (for Playwright tests)

## Setup

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   bundle install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your credentials.

4. **Setup database**
   ```bash
   rails db:create
   rails db:migrate
   rails db:seed
   ```

5. **Start the server**
   ```bash
   bin/dev
   ```

6. **Visit the app**
   Open http://localhost:3000

## Environments

- **UAT**: https://djburrup.com/expensetracker (auto-deploys from `main` branch)
- **Production**: https://mybudgethq.com (deploys from `production` branch)

## Test User

In development, a test user is seeded:
- Email: test@example.com
- Password: password123

## License

MIT
