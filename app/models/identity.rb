class Identity < ApplicationRecord
  belongs_to :user

  validates :provider, presence: true
  validates :uid, presence: true, uniqueness: { scope: :provider }

  def self.providers
    {
      google_oauth2: { name: "Google", icon: "google" },
      apple: { name: "Apple", icon: "apple" },
      microsoft_graph: { name: "Microsoft", icon: "microsoft" }
    }
  end
end
