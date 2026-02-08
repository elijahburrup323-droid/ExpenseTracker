Rails.application.routes.draw do
  # Devise routes with OmniAuth callbacks
  devise_for :users, controllers: {
    sessions: "users/sessions",
    registrations: "users/registrations",
    passwords: "users/passwords",
    omniauth_callbacks: "users/omniauth_callbacks"
  }

  # Phone authentication routes
  namespace :users do
    resources :phone_verifications, only: [:new, :create] do
      collection do
        get :verify
        post :confirm
      end
    end
  end

  # Dashboard/Home
  get "dashboard", to: "dashboard#index", as: :dashboard

  # Spending Types (HTML page)
  resources :spending_types, only: [:index]

  # Spending Categories (HTML page)
  resources :spending_categories, only: [:index]

  # Account Types (HTML page)
  resources :account_types, only: [:index]

  # Accounts (HTML page)
  resources :accounts, only: [:index]

  # Payments (HTML page)
  resources :payments, only: [:index]

  # Income Frequency Masters (HTML page, agent-only)
  resources :income_frequency_masters, only: [:index]

  # Income Frequencies (HTML page)
  resources :income_user_frequencies, only: [:index]

  # Income Sources (HTML page)
  resources :income_recurrings, only: [:index]

  # Income Entries (HTML page)
  resources :income_entries, only: [:index]

  # API endpoints
  namespace :api do
    resources :spending_types, only: [:index, :create, :update, :destroy]
    resources :spending_categories, only: [:index, :create, :update, :destroy]
    resources :account_types, only: [:index, :create, :update, :destroy]
    resources :accounts, only: [:index, :create, :update, :destroy]
    resources :payments, only: [:index, :create, :update, :destroy]
    resources :income_frequency_masters, only: [:index, :create, :update, :destroy]
    resources :income_user_frequencies, only: [:index, :update]
    resources :income_recurrings, only: [:index, :create, :update, :destroy]
    resources :income_entries, only: [:index, :create, :update, :destroy] do
      collection do
        post :generate
      end
    end
  end

  # Admin
  namespace :admin do
    resources :users, only: [:index]
  end

  # Admin API
  namespace :api do
    namespace :admin do
      resources :users, only: [:index, :update]
    end
    # DBU API (admin only)
    scope :dbu, controller: "dbu", as: :dbu do
      get "tables", action: :tables
      get "users", action: :users_list
      get "records", action: :records
      get "records/:record_id", action: :show_record, as: :show_record
      put "records/:record_id", action: :update_record, as: :update_record
      delete "records/:record_id", action: :destroy_record, as: :destroy_record
    end
  end

  # DBU (Database Utility — admin only)
  get "dbu", to: "dbu#index", as: :dbu

  # Documentation
  get "documentation", to: "documentation#index", as: :documentation
  get "documentation/database-schema", to: "documentation#database_schema", as: :documentation_database_schema
  get "documentation/claude-prompt", to: "documentation#claude_prompt", as: :documentation_claude_prompt

  # Static pages
  root "home#index"

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
