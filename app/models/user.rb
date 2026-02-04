class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [:google_oauth2, :apple, :microsoft_graph]

  has_many :identities, dependent: :destroy

  validates :email, presence: true, uniqueness: true, unless: :phone_only_user?
  validates :phone_number, uniqueness: true, allow_blank: true

  before_validation :normalize_phone_number

  def self.from_omniauth(auth)
    identity = Identity.find_or_initialize_by(provider: auth.provider, uid: auth.uid)

    if identity.user.nil?
      user = find_by(email: auth.info.email)

      if user.nil?
        user = create!(
          email: auth.info.email,
          password: Devise.friendly_token[0, 20],
          first_name: auth.info.first_name || auth.info.name&.split&.first,
          last_name: auth.info.last_name || auth.info.name&.split&.last,
          avatar_url: auth.info.image
        )
      end

      identity.user = user
      identity.save!
    end

    identity.update(
      access_token: auth.credentials&.token,
      refresh_token: auth.credentials&.refresh_token,
      expires_at: auth.credentials&.expires_at ? Time.at(auth.credentials.expires_at) : nil
    )

    identity.user
  end

  def self.find_or_create_by_phone(phone_number)
    user = find_by(phone_number: phone_number)
    return user if user

    create!(
      phone_number: phone_number,
      password: Devise.friendly_token[0, 20],
      email: "#{SecureRandom.hex(8)}@phone.local"
    )
  end

  def full_name
    [first_name, last_name].compact.join(" ").presence || email&.split("@")&.first || "User"
  end

  def phone_only_user?
    phone_number.present? && email&.end_with?("@phone.local")
  end

  def has_password?
    encrypted_password.present? && !email&.end_with?("@phone.local")
  end

  def connected_providers
    identities.pluck(:provider)
  end

  private

  def normalize_phone_number
    return if phone_number.blank?

    parsed = Phonelib.parse(phone_number)
    self.phone_number = parsed.e164 if parsed.valid?
  end
end
