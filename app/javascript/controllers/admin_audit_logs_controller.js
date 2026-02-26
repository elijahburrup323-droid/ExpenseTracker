import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tableBody", "entityTypeFilter", "actionTypeFilter", "pagination", "totalCount"]
  static values  = { apiUrl: String, csrfToken: String }

  connect() {
    this.page = 1
    this.fetchLogs()
  }

  async fetchLogs() {
    const params = new URLSearchParams()
    params.set("page", this.page)
    params.set("per_page", 50)

    const entityType = this.entityTypeFilterTarget.value
    const actionType = this.actionTypeFilterTarget.value
    if (entityType) params.set("entity_type", entityType)
    if (actionType) params.set("action_type", actionType)

    try {
      const resp = await fetch(`${this.apiUrlValue}?${params}`, {
        headers: { "Accept": "application/json" }
      })
      if (!resp.ok) return
      const data = await resp.json()
      this.renderTable(data.audit_logs)
      this.renderPagination(data.total, data.page, data.per_page)
      if (this.hasTotalCountTarget) {
        this.totalCountTarget.textContent = `${data.total} total`
      }
    } catch (_e) { /* silently fail */ }
  }

  applyFilters() {
    this.page = 1
    this.fetchLogs()
  }

  goToPage(event) {
    this.page = Number(event.currentTarget.dataset.page)
    this.fetchLogs()
  }

  renderTable(logs) {
    if (!logs || logs.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No audit logs found.</td></tr>`
      return
    }
    let html = ""
    for (const log of logs) {
      const time = new Date(log.created_at).toLocaleString()
      const actionColor = this._actionColor(log.action_type)
      const changes = this._renderChanges(log)
      html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${this._esc(time)}</td>
        <td class="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">${this._esc(log.entity_type)}<span class="text-gray-400">#${log.entity_id}</span></td>
        <td class="px-4 py-3"><span class="inline-block text-xs px-2 py-0.5 rounded font-medium ${actionColor}">${this._esc(log.action_type)}</span></td>
        <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-md">${changes}</td>
      </tr>`
    }
    this.tableBodyTarget.innerHTML = html
  }

  _renderChanges(log) {
    if (log.action_type === "RECALCULATION" && log.metadata) {
      const type = log.metadata.recalculation_type || "RECALC"
      const parts = []
      if (log.metadata.holding_security_name) parts.push(log.metadata.holding_security_name)
      if (log.metadata.instrument_name) parts.push(log.metadata.instrument_name)
      if (log.metadata.affected_transactions_count != null) parts.push(`${log.metadata.affected_transactions_count} txns affected`)
      return `<span class="font-medium">${this._esc(type)}</span> ${this._esc(parts.join(" — "))}`
    }

    if (log.action_type === "DELETE") {
      const name = log.before_json.name || log.before_json.security_name || ""
      return name ? `Deleted: <span class="font-medium">${this._esc(name)}</span>` : "Record deleted"
    }

    const keys = Object.keys(log.after_json || {})
    if (keys.length === 0) return "<span class='text-gray-400'>—</span>"
    const shown = keys.slice(0, 4).map(k => `<span class="font-mono text-gray-500 dark:text-gray-400">${this._esc(k)}</span>`)
    return shown.join(", ") + (keys.length > 4 ? ` <span class="text-gray-400">+${keys.length - 4} more</span>` : "")
  }

  _actionColor(action) {
    const colors = {
      CREATE:        "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
      UPDATE:        "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
      DELETE:        "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
      RECALCULATION: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
    }
    return colors[action] || "bg-gray-100 text-gray-700"
  }

  renderPagination(total, page, perPage) {
    const totalPages = Math.ceil(total / perPage)
    if (totalPages <= 1) { this.paginationTarget.innerHTML = ""; return }

    let html = ""
    const maxVisible = 10
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)

    for (let i = start; i <= end; i++) {
      const active = i === page
        ? "bg-brand-600 text-white border-brand-600"
        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
      html += `<button data-page="${i}" data-action="click->admin-audit-logs#goToPage"
        class="px-3 py-1 rounded text-sm ${active} border transition">${i}</button>`
    }
    this.paginationTarget.innerHTML = html
  }

  _esc(str) {
    if (!str) return ""
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
