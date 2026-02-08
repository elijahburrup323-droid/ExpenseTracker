module Api
  class DbuController < ApplicationController
    before_action :authenticate_user!
    before_action :require_admin!
    before_action :load_catalog_entry, only: [:records, :show_record, :update_record, :destroy_record]

    # GET /api/dbu/tables
    def tables
      catalogs = DbuTableCatalog.active.ordered
      render json: catalogs.map { |c| { id: c.id, table_name: c.table_name, table_description: c.table_description } }
    end

    # GET /api/dbu/users
    def users_list
      users = User.order(:email).map { |u| { id: u.id, email: u.email } }
      render json: users
    end

    # GET /api/dbu/records?table=accounts&user_id=current|all|<id>
    def records
      conn = ActiveRecord::Base.connection
      table = conn.quote_table_name(@catalog.table_name)
      pk_cols = conn.primary_keys(@catalog.table_name)
      pk_cols = ["id"] if pk_cols.empty?
      columns = conn.columns(@catalog.table_name)
      has_user_id = columns.any? { |c| c.name == "user_id" }

      conditions = []

      # User filter
      if has_user_id && params[:user_id].present? && params[:user_id] != "all"
        user_id = params[:user_id] == "current" ? current_user.id : params[:user_id].to_i
        conditions << "user_id = #{conn.quote(user_id)}"
      end

      # Exclude soft-deleted records
      has_deleted_at = columns.any? { |c| c.name == "deleted_at" }
      conditions << "deleted_at IS NULL" if has_deleted_at

      where_clause = conditions.any? ? "WHERE #{conditions.join(' AND ')}" : ""
      order_clause = "ORDER BY #{pk_cols.map { |c| conn.quote_column_name(c) }.join(', ')} ASC"
      pk_select = pk_cols.map { |c| conn.quote_column_name(c) }.join(', ')

      sql = "SELECT #{pk_select} FROM #{table} #{where_clause} #{order_clause}"
      result = conn.exec_query(sql, "DBU")

      column_info = columns.map { |c| { name: c.name, type: c.type.to_s, pk: pk_cols.include?(c.name) } }

      render json: {
        record_ids: result.rows.map { |r| r.length == 1 ? r.first : r },
        columns: column_info,
        pk_columns: pk_cols,
        has_user_id: has_user_id,
        total: result.rows.length
      }
    end

    # GET /api/dbu/records/:record_id?table=accounts
    def show_record
      conn = ActiveRecord::Base.connection
      table = conn.quote_table_name(@catalog.table_name)
      pk_cols = conn.primary_keys(@catalog.table_name)
      pk_cols = ["id"] if pk_cols.empty?

      record_id = params[:record_id]
      where = "#{conn.quote_column_name(pk_cols.first)} = #{conn.quote(record_id)}"
      sql = "SELECT * FROM #{table} WHERE #{where} LIMIT 1"
      result = conn.exec_query(sql, "DBU")

      if result.rows.empty?
        return render json: { error: "Record not found" }, status: :not_found
      end

      row = {}
      result.columns.each_with_index { |col, i| row[col] = result.rows.first[i] }
      render json: { record: row }
    end

    # PUT /api/dbu/records/:record_id?table=accounts
    def update_record
      conn = ActiveRecord::Base.connection
      table = conn.quote_table_name(@catalog.table_name)
      pk_cols = conn.primary_keys(@catalog.table_name)
      pk_cols = ["id"] if pk_cols.empty?
      columns = conn.columns(@catalog.table_name)
      column_names = columns.map(&:name)

      record_id = params[:record_id]
      fields = params[:fields]&.to_unsafe_h || {}

      # Only update non-PK fields that exist in the table
      set_parts = []
      fields.each do |key, value|
        next if pk_cols.include?(key.to_s)
        next unless column_names.include?(key.to_s)
        quoted_col = conn.quote_column_name(key.to_s)
        quoted_val = value.nil? ? "NULL" : conn.quote(value)
        set_parts << "#{quoted_col} = #{quoted_val}"
      end

      if set_parts.empty?
        return render json: { error: "No valid fields to update" }, status: :unprocessable_entity
      end

      where = "#{conn.quote_column_name(pk_cols.first)} = #{conn.quote(record_id)}"
      sql = "UPDATE #{table} SET #{set_parts.join(', ')} WHERE #{where}"
      conn.execute(sql)

      # Return updated record
      show_record
    end

    # DELETE /api/dbu/records/:record_id?table=accounts
    def destroy_record
      conn = ActiveRecord::Base.connection
      table = conn.quote_table_name(@catalog.table_name)
      pk_cols = conn.primary_keys(@catalog.table_name)
      pk_cols = ["id"] if pk_cols.empty?
      columns = conn.columns(@catalog.table_name)
      has_deleted_at = columns.any? { |c| c.name == "deleted_at" }

      record_id = params[:record_id]
      where = "#{conn.quote_column_name(pk_cols.first)} = #{conn.quote(record_id)}"

      if has_deleted_at
        sql = "UPDATE #{table} SET deleted_at = NOW() WHERE #{where}"
      else
        sql = "DELETE FROM #{table} WHERE #{where}"
      end
      conn.execute(sql)

      head :no_content
    end

    private

    def require_admin!
      unless current_user.budgethq_agent?
        render json: { error: "Admin access required" }, status: :forbidden
      end
    end

    def load_catalog_entry
      @catalog = DbuTableCatalog.active.find_by(table_name: params[:table])
      unless @catalog
        render json: { error: "Table not found in catalog" }, status: :not_found
      end
    end
  end
end
