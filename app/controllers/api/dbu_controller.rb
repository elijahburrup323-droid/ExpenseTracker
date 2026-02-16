module Api
  class DbuController < ApplicationController
    before_action :authenticate_user!
    before_action :require_admin!
    before_action :load_catalog_entry, only: [:records, :create_record, :show_record, :update_record, :destroy_record]

    # GET /api/dbu/schema
    def schema
      conn = ActiveRecord::Base.connection
      db_name = conn.current_database

      tables_sql = <<-SQL
        SELECT table_schema, table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_schema, table_name
      SQL

      columns_sql = <<-SQL
        SELECT table_name, ordinal_position, column_name,
               data_type, is_nullable, column_default,
               character_maximum_length, numeric_precision
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      SQL

      pk_sql = <<-SQL
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      SQL

      fk_sql = <<-SQL
        SELECT kcu.table_name, kcu.column_name,
               ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      SQL

      unique_sql = <<-SQL
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
      SQL

      tables_result = conn.exec_query(tables_sql)
      columns_result = conn.exec_query(columns_sql)
      pk_result = conn.exec_query(pk_sql)
      fk_result = conn.exec_query(fk_sql)
      unique_result = conn.exec_query(unique_sql)

      pk_set = Set.new
      pk_result.each { |r| pk_set.add("#{r['table_name']}.#{r['column_name']}") }

      unique_set = Set.new
      unique_result.each { |r| unique_set.add("#{r['table_name']}.#{r['column_name']}") }

      fk_map = {}
      fk_result.each do |r|
        fk_map["#{r['table_name']}.#{r['column_name']}"] = {
          table: r["foreign_table"], column: r["foreign_column"]
        }
      end

      cols_by_table = {}
      columns_result.each do |r|
        tn = r["table_name"]
        cols_by_table[tn] ||= []
        key = "#{tn}.#{r['column_name']}"
        cols_by_table[tn] << {
          ordinal_position: r["ordinal_position"],
          column_name: r["column_name"],
          data_type: r["data_type"],
          is_nullable: r["is_nullable"],
          column_default: r["column_default"],
          max_length: r["character_maximum_length"],
          numeric_precision: r["numeric_precision"],
          is_pk: pk_set.include?(key),
          is_unique: unique_set.include?(key),
          foreign_key: fk_map[key]
        }
      end

      # Merge descriptions from catalog (same source as /api/dbu/tables)
      catalog_map = DbuTableCatalog.active.pluck(:table_name, :table_description).to_h

      tables = tables_result.map do |r|
        tn = r["table_name"]
        {
          table_name: tn,
          table_type: r["table_type"],
          table_description: catalog_map[tn] || tn.tr("_", " ").capitalize,
          column_count: (cols_by_table[tn] || []).length,
          columns: cols_by_table[tn] || []
        }
      end

      render json: {
        database_name: db_name,
        refreshed_at: Time.current.iso8601,
        table_count: tables.length,
        tables: tables
      }
    end

    # GET /api/dbu/tables
    def tables
      conn = ActiveRecord::Base.connection
      sql = <<-SQL
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_name
      SQL
      result = conn.exec_query(sql)

      # Merge descriptions from catalog where available
      catalog_map = DbuTableCatalog.active.pluck(:table_name, :table_description).to_h

      render json: result.rows.map { |r|
        tn = r[0]
        tt = r[1]
        { table_name: tn, table_type: tt, table_description: catalog_map[tn] || tn.tr("_", " ").capitalize }
      }
    end

    # GET /api/dbu/users
    def users_list
      users = User.order(:email).map { |u| { id: u.id, email: u.email } }
      render json: users
    end

    # GET /api/dbu/records?table=accounts&user_id=current|all|<id>
    def records
      conn = ActiveRecord::Base.connection
      table = conn.quote_table_name(@table_name)
      pk_cols = conn.primary_keys(@table_name)
      pk_cols = ["id"] if pk_cols.empty?
      columns = conn.columns(@table_name)
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

    # POST /api/dbu/records?table=accounts
    def create_record
      conn = ActiveRecord::Base.connection
      table = conn.quote_table_name(@table_name)
      columns = conn.columns(@table_name)
      column_names = columns.map(&:name)
      pk_cols = conn.primary_keys(@table_name)
      pk_cols = ["id"] if pk_cols.empty?

      fields = params[:fields]&.to_unsafe_h || {}

      # Build column/value pairs for non-PK fields that exist in the table
      insert_cols = []
      insert_vals = []
      fields.each do |key, value|
        next unless column_names.include?(key.to_s)
        next if pk_cols.include?(key.to_s) # skip PK (auto-generated)
        insert_cols << conn.quote_column_name(key.to_s)
        insert_vals << (value.nil? || value == "" ? "NULL" : conn.quote(value))
      end

      if insert_cols.empty?
        return render json: { error: "No valid fields provided" }, status: :unprocessable_entity
      end

      sql = "INSERT INTO #{table} (#{insert_cols.join(', ')}) VALUES (#{insert_vals.join(', ')}) RETURNING #{pk_cols.map { |c| conn.quote_column_name(c) }.join(', ')}"
      result = conn.exec_query(sql, "DBU")

      if result.rows.any?
        new_id = result.rows.first.length == 1 ? result.rows.first.first : result.rows.first
        render json: { record_id: new_id }, status: :created
      else
        render json: { error: "Insert failed" }, status: :unprocessable_entity
      end
    end

    # GET /api/dbu/records/:record_id?table=accounts
    def show_record
      conn = ActiveRecord::Base.connection
      table = conn.quote_table_name(@table_name)
      pk_cols = conn.primary_keys(@table_name)
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
      table = conn.quote_table_name(@table_name)
      pk_cols = conn.primary_keys(@table_name)
      pk_cols = ["id"] if pk_cols.empty?
      columns = conn.columns(@table_name)
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
      table = conn.quote_table_name(@table_name)
      pk_cols = conn.primary_keys(@table_name)
      pk_cols = ["id"] if pk_cols.empty?
      columns = conn.columns(@table_name)
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
      table_name = params[:table].to_s
      conn = ActiveRecord::Base.connection
      exists = conn.exec_query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = #{conn.quote(table_name)} LIMIT 1"
      ).rows.any?

      if exists
        @table_name = table_name
      else
        render json: { error: "Table not found" }, status: :not_found
      end
    end
  end
end
