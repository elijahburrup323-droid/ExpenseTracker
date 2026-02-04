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

  # Static pages
  root "home#index"

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
