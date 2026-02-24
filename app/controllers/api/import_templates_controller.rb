module Api
  class ImportTemplatesController < BaseController
    before_action :set_template, only: [:update, :destroy]

    # GET /api/import_templates
    # Optional: ?column_signature=... for auto-suggest matching
    def index
      templates = current_user.import_templates.ordered

      if params[:column_signature].present?
        templates = templates.where(column_signature: params[:column_signature])
      end

      render json: templates.map { |t| template_json(t) }
    end

    # POST /api/import_templates
    def create
      template = current_user.import_templates.build(template_params)

      if template.save
        render json: template_json(template), status: :created
      else
        render_errors(template)
      end
    end

    # PATCH /api/import_templates/:id
    def update
      if @template.update(template_params)
        render json: template_json(@template)
      else
        render_errors(@template)
      end
    end

    # DELETE /api/import_templates/:id
    def destroy
      @template.soft_delete!
      head :no_content
    end

    private

    def set_template
      @template = current_user.import_templates.find_by(id: params[:id])
      render_not_found unless @template
    end

    def template_params
      params.require(:import_template).permit(
        :name, :file_type, :column_signature, :amount_sign_convention,
        :date_format, :default_account_id,
        column_mapping: {},
        classification_rules: {},
        assignment_defaults: {}
      )
    end

    def template_json(t)
      {
        id: t.id,
        name: t.name,
        file_type: t.file_type,
        column_signature: t.column_signature,
        column_mapping: t.column_mapping,
        classification_rules: t.classification_rules,
        assignment_defaults: t.assignment_defaults,
        default_account_id: t.default_account_id,
        amount_sign_convention: t.amount_sign_convention,
        date_format: t.date_format,
        use_count: t.use_count,
        last_used_at: t.last_used_at,
        created_at: t.created_at
      }
    end
  end
end
