# ExpenseTracker

A Ruby on Rails expense tracking application with comprehensive authentication options.

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
- Node.js (for asset compilation)

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
   Edit `.env` and fill in your credentials:
   - Database configuration
   - Google OAuth credentials (from Google Cloud Console)
   - Apple Sign-In credentials (from Apple Developer)
   - Microsoft OAuth credentials (from Azure Portal)
   - Twilio credentials (for SMS authentication)

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
   Or without Tailwind watcher:
   ```bash
   rails server
   ```

6. **Visit the app**
   Open http://localhost:3000

## OAuth Provider Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/users/auth/google_oauth2/callback`

### Apple Sign-In
1. Go to [Apple Developer](https://developer.apple.com)
2. Create a Services ID for Sign In with Apple
3. Configure domains and return URLs
4. Generate a private key

### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application in Azure AD
3. Add redirect URI: `http://localhost:3000/users/auth/microsoft_graph/callback`
4. Create a client secret

### Twilio SMS
1. Sign up at [Twilio](https://www.twilio.com)
2. Get your Account SID and Auth Token
3. Get or purchase a phone number

## Test User

In development, a test user is seeded:
- Email: test@example.com
- Password: password123

## Project Structure

```
app/
├── controllers/
│   ├── users/
│   │   ├── omniauth_callbacks_controller.rb
│   │   ├── passwords_controller.rb
│   │   ├── phone_verifications_controller.rb
│   │   ├── registrations_controller.rb
│   │   └── sessions_controller.rb
│   ├── application_controller.rb
│   ├── dashboard_controller.rb
│   └── home_controller.rb
├── models/
│   ├── identity.rb          # OAuth provider connections
│   ├── phone_verification.rb # SMS verification codes
│   └── user.rb              # User model with Devise
├── views/
│   ├── devise/              # Authentication views
│   ├── users/phone_verifications/
│   ├── dashboard/
│   ├── home/
│   └── shared/
└── javascript/
    └── controllers/         # Stimulus controllers
```

## License

MIT
