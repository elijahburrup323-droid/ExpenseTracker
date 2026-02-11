import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "searchInput", "userSelect", "tableNameSelect", "tableDescSelect",
    "recordPanel", "emptyMessage",
    "tabSchema", "tabRecords", "schemaPanel", "recordsPanel",
    "schemaSearch", "schemaMeta", "schemaContent",
    "recordsMeta"
  ]
  static values = { tablesUrl: String, usersUrl: String, recordsUrl: String, schemaUrl: String, csrfToken: String }

  connect() {
    // Record browser state
    this.allTables = []
    this.filteredTables = []
    this.users = []
    this.recordIds = []
    this.currentIndex = -1
    this.columns = []
    this.pkColumns = []
    this.hasUserId = false
    this.isDirty = false
    this.selectedTable = null

    // Schema inspector state
    this.schemaData = null
    this.expandedTables = new Set()
    this.schemaFilter = ""

    // Default: load Record Browser data
    this.fetchInitialData()
  }

  // ==================== TAB SWITCHING ====================

  switchToSchema() {
    this.tabSchemaTarget.className = "whitespace-nowrap border-b-2 border-brand-600 py-3 px-1 text-sm font-medium text-brand-600 dark:text-brand-400"
    this.tabRecordsTarget.className = "whitespace-nowrap border-b-2 border-transparent py-3 px-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
    this.schemaPanelTarget.classList.remove("hidden")
    this.recordsPanelTarget.classList.add("hidden")
    // Lazy-load schema data
    if (!this.schemaData) this.fetchSchema()
  }

  switchToRecords() {
    this.tabRecordsTarget.className = "whitespace-nowrap border-b-2 border-brand-600 py-3 px-1 text-sm font-medium text-brand-600 dark:text-brand-400"
    this.tabSchemaTarget.className = "whitespace-nowrap border-b-2 border-transparent py-3 px-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
    this.recordsPanelTarget.classList.remove("hidden")
    this.schemaPanelTarget.classList.add("hidden")
  }

  // ==================== SCHEMA INSPECTOR ====================

  async fetchSchema() {
    this.schemaContentTarget.innerHTML = `
      <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="mx-auto h-8 w-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
          <p class="mt-2 text-sm text-gray-400 dark:text-gray-500">Loading schema...</p>
        </div>
      </div>`
    try {
      const res = await fetch(this.schemaUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) {
        this.schemaData = await res.json()
        this._renderSchemaMeta()
        this._renderSchemaContent()
      } else {
        this.schemaContentTarget.innerHTML = `<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center h-64"><p class="text-sm text-red-500">Failed to load schema.</p></div>`
      }
    } catch (e) {
      this.schemaContentTarget.innerHTML = `<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center h-64"><p class="text-sm text-red-500">Network error loading schema.</p></div>`
    }
  }

  refreshSchema() {
    this.expandedTables.clear()
    this.fetchSchema()
  }

  filterSchema() {
    this.schemaFilter = this.schemaSearchTarget.value.trim().toLowerCase()
    this._renderSchemaContent()
  }

  expandAll() {
    if (!this.schemaData) return
    const tables = this._filteredSchemaTables()
    tables.forEach(t => this.expandedTables.add(t.table_name))
    this._renderSchemaContent()
  }

  collapseAll() {
    this.expandedTables.clear()
    this._renderSchemaContent()
  }

  toggleTable(event) {
    const tableName = event.currentTarget.dataset.tableName
    if (this.expandedTables.has(tableName)) {
      this.expandedTables.delete(tableName)
    } else {
      this.expandedTables.add(tableName)
    }
    this._renderSchemaContent()
  }

  _filteredSchemaTables() {
    if (!this.schemaData) return []
    const q = this.schemaFilter
    if (!q) return this.schemaData.tables
    return this.schemaData.tables.filter(t => {
      if (t.table_name.toLowerCase().includes(q)) return true
      return t.columns.some(c => c.column_name.toLowerCase().includes(q))
    })
  }

  _renderSchemaMeta() {
    const d = this.schemaData
    const ts = new Date(d.refreshed_at).toLocaleString()
    this.schemaMetaTarget.innerHTML = `
      <span><strong>Database:</strong> ${this._esc(d.database_name)}</span>
      <span><strong>Tables:</strong> ${d.table_count}</span>
      <span><strong>Last Refreshed:</strong> ${this._esc(ts)}</span>`
  }

  _renderSchemaContent() {
    const tables = this._filteredSchemaTables()
    if (tables.length === 0) {
      this.schemaContentTarget.innerHTML = `
        <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center h-32">
          <p class="text-sm text-gray-400 dark:text-gray-500">No tables match your filter.</p>
        </div>`
      return
    }

    let html = ""
    for (const table of tables) {
      const isExpanded = this.expandedTables.has(table.table_name)
      const chevron = isExpanded
        ? `<svg class="h-5 w-5 text-gray-400 transition-transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
        : `<svg class="h-5 w-5 text-gray-400 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
      const typeBadge = table.table_type === "VIEW"
        ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">View</span>`
        : ""

      html += `<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">`
      html += `<button type="button" class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                       data-action="click->dbu#toggleTable" data-table-name="${this._escAttr(table.table_name)}">
        <div class="flex items-center">
          ${chevron}
          <span class="ml-2 text-sm font-semibold text-gray-900 dark:text-white">${this._esc(table.table_name)}</span>
          ${typeBadge}
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400">${table.column_count} columns</span>
      </button>`

      if (isExpanded) {
        html += `<div class="border-t border-gray-200 dark:border-gray-700">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-8">#</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Column</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nullable</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Default</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Keys</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">`

        for (const col of table.columns) {
          const highlight = this.schemaFilter && col.column_name.toLowerCase().includes(this.schemaFilter)
            ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
          const typeStr = this._formatDataType(col)
          const nullable = col.is_nullable === "YES"
            ? `<span class="text-green-600 dark:text-green-400">Yes</span>`
            : `<span class="text-red-600 dark:text-red-400">No</span>`
          const defaultVal = col.column_default ? `<code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">${this._esc(this._truncate(col.column_default, 40))}</code>` : `<span class="text-gray-300 dark:text-gray-600">—</span>`

          let keys = ""
          if (col.is_pk) keys += `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-brand-600 text-white mr-1">PK</span>`
          if (col.foreign_key) keys += `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 mr-1" title="${this._escAttr(col.foreign_key.table)}.${this._escAttr(col.foreign_key.column)}">FK → ${this._esc(col.foreign_key.table)}</span>`
          if (col.is_unique && !col.is_pk) keys += `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">UQ</span>`
          if (!keys) keys = `<span class="text-gray-300 dark:text-gray-600">—</span>`

          html += `<tr class="${highlight}">
            <td class="px-4 py-2 text-gray-400 dark:text-gray-500">${col.ordinal_position}</td>
            <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">${this._esc(col.column_name)}</td>
            <td class="px-4 py-2 text-gray-600 dark:text-gray-300">${this._esc(typeStr)}</td>
            <td class="px-4 py-2">${nullable}</td>
            <td class="px-4 py-2">${defaultVal}</td>
            <td class="px-4 py-2">${keys}</td>
          </tr>`
        }
        html += `</tbody></table></div>`
      }
      html += `</div>`
    }
    this.schemaContentTarget.innerHTML = html
  }

  _formatDataType(col) {
    let type = col.data_type
    if (col.max_length) type += `(${col.max_length})`
    else if (col.numeric_precision && col.data_type === "numeric") type += `(${col.numeric_precision})`
    return type
  }

  _truncate(str, len) {
    if (!str) return ""
    return str.length > len ? str.substring(0, len) + "..." : str
  }

  // --- Export ---

  exportCSV() {
    if (!this.schemaData) return
    const tables = this._filteredSchemaTables()
    let csv = "table_name,ordinal_position,column_name,data_type,is_nullable,column_default,is_pk,is_unique,fk_table,fk_column\n"
    for (const t of tables) {
      for (const c of t.columns) {
        csv += [
          this._csvEsc(t.table_name),
          c.ordinal_position,
          this._csvEsc(c.column_name),
          this._csvEsc(this._formatDataType(c)),
          c.is_nullable,
          this._csvEsc(c.column_default || ""),
          c.is_pk,
          c.is_unique,
          this._csvEsc(c.foreign_key ? c.foreign_key.table : ""),
          this._csvEsc(c.foreign_key ? c.foreign_key.column : "")
        ].join(",") + "\n"
      }
    }
    this._downloadFile(csv, "dbu_schema.csv", "text/csv")
  }

  exportJSON() {
    if (!this.schemaData) return
    const tables = this._filteredSchemaTables()
    const data = { ...this.schemaData, tables, table_count: tables.length }
    this._downloadFile(JSON.stringify(data, null, 2), "dbu_schema.json", "application/json")
  }

  _csvEsc(val) {
    if (!val) return ""
    const str = String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  _downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ==================== RECORD BROWSER (existing) ====================

  async fetchInitialData() {
    try {
      const [tablesRes, usersRes] = await Promise.all([
        fetch(this.tablesUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.usersUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (tablesRes.ok) this.allTables = await tablesRes.json()
      if (usersRes.ok) this.users = await usersRes.json()
    } catch (e) {
      // silently fail
    }
    this.filteredTables = [...this.allTables]
    this._populateDropdowns()
    this._populateUserDropdown()
    this._renderRecordsMeta()
  }

  async refreshRecords() {
    if (!this._checkDirty()) return
    this.allTables = []
    this.filteredTables = []
    this.selectedTable = null
    this.recordIds = []
    this.currentIndex = -1
    this.searchInputTarget.value = ""
    // Also invalidate schema cache so it re-fetches if user switches tab
    this.schemaData = null
    await this.fetchInitialData()
    this._showEmpty("Select a table to browse records.")
  }

  _renderRecordsMeta() {
    if (this.hasRecordsMetaTarget) {
      const total = this.allTables.length
      const filtered = this.filteredTables.length
      const countText = filtered === total
        ? `<strong>Tables:</strong> ${total}`
        : `<strong>Tables:</strong> ${filtered} of ${total}`
      this.recordsMetaTarget.innerHTML = `
        <span><strong>Schema:</strong> public</span>
        <span>${countText}</span>`
    }
  }

  // --- Dropdowns ---

  _populateDropdowns() {
    const nameSelect = this.tableNameSelectTarget
    const descSelect = this.tableDescSelectTarget
    nameSelect.innerHTML = `<option value="">Select Table...</option>` +
      this.filteredTables.map(t => `<option value="${this._esc(t.table_name)}">${this._esc(t.table_name)}</option>`).join("")
    descSelect.innerHTML = `<option value="">Select Description...</option>` +
      this.filteredTables.map(t => `<option value="${this._esc(t.table_name)}">${this._esc(t.table_description)}</option>`).join("")
  }

  _populateUserDropdown() {
    const sel = this.userSelectTarget
    sel.innerHTML = `<option value="current">Current User</option><option value="all">All Users</option>` +
      this.users.map(u => `<option value="${u.id}">${this._esc(u.email)}</option>`).join("")
  }

  // --- Search ---

  search() {
    const query = this.searchInputTarget.value.trim().toLowerCase()
    if (!query) {
      this.filteredTables = [...this.allTables]
    } else {
      this.filteredTables = this.allTables.filter(t =>
        t.table_name.toLowerCase().includes(query) ||
        (t.table_description || "").toLowerCase().includes(query)
      )
    }

    const currentName = this.tableNameSelectTarget.value
    const stillExists = currentName && this.filteredTables.some(t => t.table_name === currentName)

    this._populateDropdowns()
    this._renderRecordsMeta()

    if (stillExists) {
      this.tableNameSelectTarget.value = currentName
      this.tableDescSelectTarget.value = currentName
    } else {
      this.selectedTable = null
      this.recordIds = []
      this.currentIndex = -1
      this._showEmpty("No tables match your criteria.")
    }
  }

  searchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.search()
    }
  }

  // --- Reset ---

  resetFilters() {
    if (!this._checkDirty()) return
    this.searchInputTarget.value = ""
    this.filteredTables = [...this.allTables]
    this._populateDropdowns()
    this._renderRecordsMeta()
    this.selectedTable = null
    this.recordIds = []
    this.currentIndex = -1
    this._showEmpty("Select a table to browse records.")
  }

  // --- Table Selection ---

  onTableNameChange() {
    if (!this._checkDirty()) {
      this.tableNameSelectTarget.value = this.selectedTable || ""
      this.tableDescSelectTarget.value = this.selectedTable || ""
      return
    }
    const tableName = this.tableNameSelectTarget.value
    this.tableDescSelectTarget.value = tableName
    if (tableName) {
      this.selectedTable = tableName
      this._loadRecords()
    } else {
      this.selectedTable = null
      this._showEmpty("Select a table to browse records.")
    }
  }

  onTableDescChange() {
    if (!this._checkDirty()) {
      this.tableNameSelectTarget.value = this.selectedTable || ""
      this.tableDescSelectTarget.value = this.selectedTable || ""
      return
    }
    const tableName = this.tableDescSelectTarget.value
    this.tableNameSelectTarget.value = tableName
    if (tableName) {
      this.selectedTable = tableName
      this._loadRecords()
    } else {
      this.selectedTable = null
      this._showEmpty("Select a table to browse records.")
    }
  }

  onUserChange() {
    if (!this._checkDirty()) {
      // Cannot easily revert user select — just proceed
    }
    if (this.selectedTable) {
      this._loadRecords()
    }
  }

  // --- Record Loading ---

  async _loadRecords() {
    const userId = this.userSelectTarget.value
    const url = `${this.recordsUrlValue}?table=${encodeURIComponent(this.selectedTable)}&user_id=${encodeURIComponent(userId)}`
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (res.ok) {
        const data = await res.json()
        this.recordIds = data.record_ids
        this.columns = data.columns
        this.pkColumns = data.pk_columns
        this.hasUserId = data.has_user_id
        this.currentIndex = this.recordIds.length > 0 ? 0 : -1
        if (this.recordIds.length > 0) {
          this._loadCurrentRecord()
        } else {
          this._showEmpty("No records found for this table.")
        }
      }
    } catch (e) {
      this._showEmpty("Error loading records.")
    }
  }

  async _loadCurrentRecord() {
    const recordId = this.recordIds[this.currentIndex]
    const url = `${this.recordsUrlValue}/${encodeURIComponent(recordId)}?table=${encodeURIComponent(this.selectedTable)}`
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (res.ok) {
        const data = await res.json()
        this.currentRecord = data.record
        this.isDirty = false
        this._renderRecordPanel()
      }
    } catch (e) {
      this._showEmpty("Error loading record.")
    }
  }

  // --- Navigation ---

  prevRecord() {
    if (!this._checkDirty()) return
    if (this.currentIndex > 0) {
      this.currentIndex--
      this._loadCurrentRecord()
    }
  }

  nextRecord() {
    if (!this._checkDirty()) return
    if (this.currentIndex < this.recordIds.length - 1) {
      this.currentIndex++
      this._loadCurrentRecord()
    }
  }

  // --- Dirty State ---

  markDirty() {
    this.isDirty = true
  }

  _checkDirty() {
    if (!this.isDirty) return true
    const choice = confirm("You have unsaved changes. Discard and continue?")
    if (choice) {
      this.isDirty = false
      return true
    }
    return false
  }

  // --- Save ---

  async saveRecord() {
    const fields = {}
    this.columns.forEach(col => {
      if (this.pkColumns.includes(col.name)) return
      const input = this.recordPanelTarget.querySelector(`[data-field="${col.name}"]`)
      if (input) {
        fields[col.name] = input.value === "" ? null : input.value
      }
    })

    const recordId = this.recordIds[this.currentIndex]
    const url = `${this.recordsUrlValue}/${encodeURIComponent(recordId)}?table=${encodeURIComponent(this.selectedTable)}`
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ fields })
      })
      if (res.ok) {
        const data = await res.json()
        this.currentRecord = data.record
        this.isDirty = false
        this._renderRecordPanel()
        this._flashSaveSuccess()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to save")
      }
    } catch (e) {
      alert("Network error")
    }
  }

  // --- Delete ---

  async deleteRecord() {
    if (this.isDirty) {
      if (!confirm("You have unsaved changes. Discard and delete this record?")) return
    }
    if (!confirm("Are you sure you want to permanently delete this record?")) return

    const recordId = this.recordIds[this.currentIndex]
    const url = `${this.recordsUrlValue}/${encodeURIComponent(recordId)}?table=${encodeURIComponent(this.selectedTable)}`
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (res.ok || res.status === 204) {
        this.recordIds.splice(this.currentIndex, 1)
        this.isDirty = false
        if (this.recordIds.length === 0) {
          this.currentIndex = -1
          this._showEmpty("No records found for this table.")
        } else {
          if (this.currentIndex >= this.recordIds.length) this.currentIndex = this.recordIds.length - 1
          this._loadCurrentRecord()
        }
      }
    } catch (e) {
      alert("Network error")
    }
  }

  // --- Rendering ---

  _renderRecordPanel() {
    const record = this.currentRecord
    const total = this.recordIds.length
    const idx = this.currentIndex + 1
    const prevDisabled = this.currentIndex <= 0 ? "disabled" : ""
    const nextDisabled = this.currentIndex >= total - 1 ? "disabled" : ""

    const descCol = this.columns.find(c => c.name === "description" || c.name === "table_description")

    let fieldsHtml = ""
    const orderedCols = [...this.columns]

    if (descCol) {
      const idx = orderedCols.indexOf(descCol)
      if (idx > -1) {
        orderedCols.splice(idx, 1)
        orderedCols.unshift(descCol)
      }
    }

    for (const col of orderedCols) {
      const isPk = this.pkColumns.includes(col.name)
      const value = record[col.name]
      const displayValue = value === null || value === undefined ? "" : String(value)
      const label = this._humanize(col.name)
      const pkBadge = isPk ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-brand-600 text-white">PK</span>` : ""
      const readOnly = isPk

      const isUserField = col.name === "user_id" && this.userSelectTarget.value === "all"
      const fieldReadOnly = readOnly || isUserField

      fieldsHtml += `
        <div class="grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">${this._esc(label)}${pkBadge}</label>
          <div class="col-span-2">
            <input type="text" value="${this._escAttr(displayValue)}" data-field="${this._escAttr(col.name)}"
                   class="w-full h-9 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-2 ${fieldReadOnly ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}"
                   ${fieldReadOnly ? 'readonly' : `data-action="input->dbu#markDirty"`}>
          </div>
        </div>`
    }

    const tableLabel = this._esc(this.selectedTable)

    this.recordPanelTarget.innerHTML = `
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${tableLabel}</h3>
          <div class="flex items-center space-x-2">
            <button type="button" class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    data-action="click->dbu#prevRecord" ${prevDisabled} title="Previous">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span class="text-sm text-gray-500 dark:text-gray-400">${idx} of ${total} Filtered</span>
            <button type="button" class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    data-action="click->dbu#nextRecord" ${nextDisabled} title="Next">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <button type="button"
                    class="h-8 inline-flex items-center px-3 text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                    data-action="click->dbu#saveRecord">
              Save
            </button>
            <button type="button"
                    class="h-8 inline-flex items-center px-3 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition"
                    data-action="click->dbu#deleteRecord">
              Delete
            </button>
          </div>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          ${fieldsHtml}
        </div>
      </div>`
  }

  _showEmpty(message) {
    this.recordPanelTarget.innerHTML = `
      <div class="flex items-center justify-center h-64">
        <p class="text-sm text-gray-400 dark:text-gray-500">${this._esc(message)}</p>
      </div>`
  }

  _flashSaveSuccess() {
    const btn = this.recordPanelTarget.querySelector("[data-action='click->dbu#saveRecord']")
    if (!btn) return
    const original = btn.textContent
    btn.textContent = "Saved!"
    btn.classList.replace("bg-brand-600", "bg-green-600")
    btn.classList.replace("hover:bg-brand-700", "hover:bg-green-700")
    setTimeout(() => {
      btn.textContent = original
      btn.classList.replace("bg-green-600", "bg-brand-600")
      btn.classList.replace("hover:bg-green-700", "hover:bg-brand-700")
    }, 1500)
  }

  // --- Helpers ---

  _humanize(str) {
    return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  _esc(str) {
    if (!str) return ""
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  _escAttr(str) {
    if (!str) return ""
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }
}
