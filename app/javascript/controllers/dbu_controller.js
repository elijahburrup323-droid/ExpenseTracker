import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "searchInput", "userSelect", "tableNameSelect", "tableDescSelect",
    "recordPanel", "emptyMessage"
  ]
  static values = { tablesUrl: String, usersUrl: String, recordsUrl: String, csrfToken: String }

  connect() {
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
    this.fetchInitialData()
  }

  // --- Data Fetching ---

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

    // Check if current selection still exists
    const currentName = this.tableNameSelectTarget.value
    const stillExists = currentName && this.filteredTables.some(t => t.table_name === currentName)

    this._populateDropdowns()

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
    this.selectedTable = null
    this.recordIds = []
    this.currentIndex = -1
    this._showEmpty("No tables match your criteria.")
  }

  // --- Table Selection ---

  onTableNameChange() {
    if (!this._checkDirty()) {
      // Revert selection
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
      this._showEmpty("No tables match your criteria.")
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
      this._showEmpty("No tables match your criteria.")
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

    // Find description-like column to show at top
    const descCol = this.columns.find(c => c.name === "description" || c.name === "table_description")

    let fieldsHtml = ""
    const orderedCols = [...this.columns]

    // Move description to top if exists
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

      // Show user_id as read-only when viewing All Users
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
