module Api
  class LegalPageSectionsController < BaseController
    before_action :require_agent

    def index
      page = LegalPage.find_by!(slug: params[:slug])
      sections = page.legal_page_sections.ordered
      render json: sections.map { |s| serialize(s) }
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Page not found" }, status: :not_found
    end

    def create
      page = LegalPage.find_by!(slug: params[:slug])
      section = page.legal_page_sections.new(section_params)
      section.updated_by = current_user.id

      if section.save
        render json: serialize(section), status: :created
      else
        render json: { errors: section.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Page not found" }, status: :not_found
    end

    def update
      section = LegalPageSection.find(params[:id])
      section.updated_by = current_user.id

      if section.update(section_params)
        render json: serialize(section)
      else
        render json: { errors: section.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      section = LegalPageSection.find(params[:id])
      section.destroy!
      render json: { success: true }
    end

    private

    def require_agent
      unless current_user.budgethq_agent?
        render json: { error: "Access denied" }, status: :forbidden
      end
    end

    ALLOWED_TAGS = %w[p br strong em u a ul ol li h2 h3 blockquote hr span].freeze
    ALLOWED_ATTRS = { "a" => %w[href target rel], "span" => %w[class] }.freeze

    def section_params
      raw = params.require(:legal_page_section).permit(:section_number, :section_title, :section_body, :display_order, :is_active)
      if raw[:section_body].present?
        raw[:section_body] = ActionController::Base.helpers.sanitize(
          raw[:section_body],
          tags: ALLOWED_TAGS,
          attributes: ALLOWED_ATTRS.values.flatten.uniq
        )
      end
      raw
    end

    def serialize(s)
      {
        id: s.id,
        legal_page_id: s.legal_page_id,
        section_number: s.section_number,
        section_title: s.section_title,
        section_body: s.section_body,
        display_order: s.display_order,
        is_active: s.is_active,
        updated_by: s.updated_by,
        updated_at: s.updated_at&.iso8601
      }
    end
  end
end
