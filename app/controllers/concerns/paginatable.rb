module Paginatable
  extend ActiveSupport::Concern

  MAX_PER_PAGE = 500  # No screen may render more than 500 rows at once
  DEFAULT_PER_PAGE = 50

  private

  # Parse pagination params with safety bounds.
  # Returns [page, per_page] with page >= 1 and per_page clamped to MAX_PER_PAGE.
  def pagination_params(default_per_page: DEFAULT_PER_PAGE)
    page = [params.fetch(:page, 1).to_i, 1].max
    per_page = params.fetch(:per_page, default_per_page).to_i.clamp(1, MAX_PER_PAGE)
    [page, per_page]
  end

  # Apply pagination to a relation. Returns [paginated_relation, pagination_meta].
  # pagination_meta is a hash: { page:, per_page:, total:, total_pages:, has_more: }
  def paginate(relation, default_per_page: DEFAULT_PER_PAGE)
    page, per_page = pagination_params(default_per_page: default_per_page)
    total = relation.count
    total_pages = (total.to_f / per_page).ceil

    paginated = relation.offset((page - 1) * per_page).limit(per_page)

    meta = {
      page: page,
      per_page: per_page,
      total: total,
      total_pages: total_pages,
      has_more: page < total_pages
    }

    [paginated, meta]
  end

  # Parse sort params with an allowlist of permitted columns.
  # Returns [sort_column, sort_direction] or the defaults if invalid.
  def sort_params(allowed_columns:, default_column: "created_at", default_direction: "desc")
    column = allowed_columns.include?(params[:sort]) ? params[:sort] : default_column
    direction = %w[asc desc].include?(params[:direction]&.downcase) ? params[:direction].downcase : default_direction
    [column, direction]
  end
end
