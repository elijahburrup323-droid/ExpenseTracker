# BudgetHQ - Database Schema

**Database:** PostgreSQL
**Database Name:** `expense_tracker_development`
**Schema Version:** `2024_01_01_000006`

---

## Entity Relationship Diagram

```
┌──────────────────────────────┐
│           USERS              │
├──────────────────────────────┤
│ id (PK, bigint)              │
│ email (string, unique)       │──────┐
│ encrypted_password (string)  │      │
│ first_name (string)          │      │
│ last_name (string)           │      │
│ avatar_url (string)          │      │
│ phone_number (string, unique)│      │
│ ...devise fields...          │      │
│ created_at / updated_at      │      │
└──────────────────────────────┘      │
          │                           │
          │ has_many                   │
          ▼                           │
┌──────────────────────────────┐      │
│         IDENTITIES           │      │
├──────────────────────────────┤      │
│ id (PK, bigint)              │      │
│ user_id (FK) ────────────────│──────┘
│ provider (string)            │
│ uid (string)                 │
│ access_token (string)        │
│ refresh_token (string)       │
│ expires_at (datetime)        │
│ created_at / updated_at      │
└──────────────────────────────┘

┌──────────────────────────────┐
│       ACCOUNT_TYPES          │
├──────────────────────────────┤
│ id (PK, bigint)              │
│ user_id (FK → users)         │
│ name (string, 80)            │
│ description (string, 255)    │
│ icon_key (string, 40)        │
│ color_key (string, 40)       │
│ sort_order (integer)         │
│ is_system (boolean)          │
│ is_active (boolean)          │
│ deleted_at (datetime)        │
│ created_at / updated_at      │
└──────────────────────────────┘

┌──────────────────────────────┐
│    PHONE_VERIFICATIONS       │  (standalone, no FK)
├──────────────────────────────┤
│ id (PK, bigint)              │
│ phone_number (string)        │
│ code (string)                │
│ expires_at (datetime)        │
│ verified_at (datetime)       │
│ created_at / updated_at      │
└──────────────────────────────┘
```

---

## Table Details

### `users`

The central table. Stores all user accounts regardless of how they signed up.

| Column                   | Type     | Nullable | Default | Notes                              |
|--------------------------|----------|----------|---------|------------------------------------|
| `id`                     | bigint   | NO       | auto    | Primary key                        |
| **email**                | string   | NO       | `""`    | Unique index. Used for login       |
| **encrypted_password**   | string   | NO       | `""`    | Bcrypt hash (Devise)               |
| **first_name**           | string   | YES      |         | From signup form or OAuth          |
| **last_name**            | string   | YES      |         | From signup form or OAuth          |
| **avatar_url**           | string   | YES      |         | Profile image URL (from OAuth)     |
| **phone_number**         | string   | YES      |         | E.164 format, unique index         |
| `reset_password_token`   | string   | YES      |         | Devise recoverable                 |
| `reset_password_sent_at` | datetime | YES      |         | Devise recoverable                 |
| `remember_created_at`    | datetime | YES      |         | Devise rememberable                |
| `sign_in_count`          | integer  | NO       | `0`     | Devise trackable                   |
| `current_sign_in_at`     | datetime | YES      |         | Devise trackable                   |
| `last_sign_in_at`        | datetime | YES      |         | Devise trackable                   |
| `current_sign_in_ip`     | string   | YES      |         | Devise trackable                   |
| `last_sign_in_ip`        | string   | YES      |         | Devise trackable                   |
| `confirmation_token`     | string   | YES      |         | Devise confirmable (not enabled)   |
| `confirmed_at`           | datetime | YES      |         | Devise confirmable (not enabled)   |
| `confirmation_sent_at`   | datetime | YES      |         | Devise confirmable (not enabled)   |
| `unconfirmed_email`      | string   | YES      |         | Devise confirmable (not enabled)   |
| `failed_attempts`        | integer  | NO       | `0`     | Devise lockable (not enabled)      |
| `unlock_token`           | string   | YES      |         | Devise lockable (not enabled)      |
| `locked_at`              | datetime | YES      |         | Devise lockable (not enabled)      |
| `created_at`             | datetime | NO       | auto    |                                    |
| `updated_at`             | datetime | NO       | auto    |                                    |

**Indexes:**
| Index Name                            | Columns                | Unique |
|---------------------------------------|------------------------|--------|
| `index_users_on_email`                | `email`                | YES    |
| `index_users_on_phone_number`         | `phone_number`         | YES    |
| `index_users_on_reset_password_token` | `reset_password_token` | YES    |
| `index_users_on_confirmation_token`   | `confirmation_token`   | YES    |
| `index_users_on_unlock_token`         | `unlock_token`         | YES    |

**Devise Modules Enabled:** `database_authenticatable`, `registerable`, `recoverable`, `rememberable`, `validatable`, `trackable`, `omniauthable`

**Devise Modules with DB columns but NOT enabled:** `confirmable`, `lockable`

---

### `identities`

Links users to their OAuth provider accounts. One user can have multiple identities (Google + Apple + Microsoft).

| Column           | Type     | Nullable | Notes                                       |
|------------------|----------|----------|---------------------------------------------|
| `id`             | bigint   | NO       | Primary key                                 |
| **user_id**      | bigint   | NO       | Foreign key -> `users.id`                   |
| **provider**     | string   | NO       | `google_oauth2`, `apple`, `microsoft_graph` |
| **uid**          | string   | NO       | Unique ID from the OAuth provider           |
| `access_token`   | string   | YES      | OAuth access token                          |
| `refresh_token`  | string   | YES      | OAuth refresh token                         |
| `expires_at`     | datetime | YES      | Token expiration time                       |
| `created_at`     | datetime | NO       |                                             |
| `updated_at`     | datetime | NO       |                                             |

**Indexes:**
| Index Name                                    | Columns              | Unique |
|-----------------------------------------------|----------------------|--------|
| `index_identities_on_provider_and_uid`        | `provider`, `uid`    | YES    |
| `index_identities_on_user_id_and_provider`    | `user_id`, `provider`| YES    |
| `index_identities_on_user_id`                 | `user_id`            | NO     |

**Foreign Keys:** `user_id` -> `users.id`

**Constraints:** A user can only have one identity per provider (unique on `user_id + provider`). A provider+uid pair is globally unique.

---

### `account_types`

Per-user financial account classifications with soft delete. Defaults seeded: Checking, Savings, Venmo.

| Column           | Type     | Nullable | Default | Notes                              |
|------------------|----------|----------|---------|------------------------------------|
| `id`             | bigint   | NO       | auto    | Primary key                        |
| **user_id**      | bigint   | NO       |         | Foreign key -> `users.id`          |
| **name**         | string   | NO       |         | Display name (max 80)              |
| **description**  | string   | YES      |         | Short description (max 255)        |
| **icon_key**     | string   | YES      |         | Icon identifier (max 40)           |
| **color_key**    | string   | YES      |         | Color identifier (max 40)          |
| **sort_order**   | integer  | NO       | `0`     | Display order                      |
| **is_system**    | boolean  | NO       | `false` | Auto-seeded row                    |
| **is_active**    | boolean  | NO       | `true`  | Active flag                        |
| `deleted_at`     | datetime | YES      |         | Soft-delete timestamp              |
| `created_at`     | datetime | NO       | auto    |                                    |
| `updated_at`     | datetime | NO       | auto    |                                    |

**Indexes:**
| Index Name                                      | Columns                          | Unique |
|-------------------------------------------------|----------------------------------|--------|
| `index_account_types_on_user_id_and_lower_name` | `user_id`, `LOWER(name)` (partial, WHERE deleted_at IS NULL) | YES |
| `index_account_types_on_user_id_and_sort_order` | `user_id`, `sort_order`          | NO     |
| `index_account_types_on_user_id`                | `user_id`                        | NO     |

**Foreign Keys:** `user_id` -> `users.id`

---

### `phone_verifications`

Temporary records for SMS verification codes. No foreign key to users - linked by phone number after verification.

| Column           | Type     | Nullable | Notes                               |
|------------------|----------|----------|-------------------------------------|
| `id`             | bigint   | NO       | Primary key                         |
| **phone_number** | string   | NO       | E.164 format (e.g., `+15551234567`) |
| **code**         | string   | NO       | 6-digit verification code           |
| **expires_at**   | datetime | NO       | 10 minutes after creation           |
| `verified_at`    | datetime | YES      | Set when code is confirmed          |
| `created_at`     | datetime | NO       |                                     |
| `updated_at`     | datetime | NO       |                                     |

**Indexes:**
| Index Name                                          | Columns              | Unique |
|-----------------------------------------------------|----------------------|--------|
| `index_phone_verifications_on_phone_number_and_code` | `phone_number`, `code` | NO   |
| `index_phone_verifications_on_phone_number`          | `phone_number`        | NO   |

---

## Authentication Flows

### 1. Email/Password Sign Up
```
User fills form -> RegistrationsController#create
  -> Creates `users` row with:
       email, encrypted_password, first_name, last_name
  -> Signs in and redirects to /dashboard
```

### 2. Email/Password Sign In
```
User fills form -> SessionsController#create
  -> Devise authenticates email + password against `users` table
  -> Updates trackable fields (sign_in_count, current_sign_in_at, etc.)
  -> Redirects to /dashboard
```

### 3. OAuth Sign In (Google / Apple / Microsoft)
```
User clicks OAuth button -> Redirected to provider
  -> Provider callback hits OmniauthCallbacksController
  -> User.from_omniauth(auth):
       1. Find or initialize Identity by (provider, uid)
       2. If identity has no user:
          a. Look for existing user by email
          b. If none, create new user with random password
          c. Link identity to user
       3. Update identity tokens
       4. Return user
  -> Signs in and redirects to /dashboard
```

### 4. Phone Number Sign In
```
Step 1: User enters phone number
  -> PhoneVerificationsController#create
  -> Creates `phone_verifications` row with:
       phone_number (E.164), code (6-digit), expires_at (+10 min)
  -> Sends SMS via Twilio (mocked in dev)

Step 2: User enters verification code
  -> PhoneVerificationsController#confirm
  -> Checks code matches and not expired
  -> User.find_or_create_by_phone(phone_number):
       1. Find existing user by phone_number
       2. If none, create new user with:
            random password, fake email (hex@phone.local)
  -> Signs in and redirects to /dashboard
```

---

## Relationships Summary

```
User (1) ──── has_many ────> Identity (N)
               dependent: :destroy

User (1) ──── has_many ────> AccountType (N)
               dependent: :destroy

PhoneVerification -- no FK relationship --
  (linked to User by phone_number match after verification)
```

| Model              | Association              | Foreign Key | On Delete |
|--------------------|--------------------------|-------------|-----------|
| User               | has_many :identities     | -           | destroy   |
| User               | has_many :account_types  | -           | destroy   |
| Identity           | belongs_to :user         | user_id     | -         |
| AccountType        | belongs_to :user         | user_id     | -         |
| PhoneVerification  | (standalone)             | -           | -         |
