import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tableBody", "searchInput"]
  static values = { apiUrl: String, csrfToken: String, currentUserId: Number }

  connect() {
    this.users = []
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const response = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (response.ok) this.users = await response.json()
    } catch (e) { /* silently fail */ }
    this.renderTable()
  }

  // --- Search ---

  applySearch() {
    this.renderTable()
  }

  searchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.renderTable()
    }
  }

  _getFilteredUsers() {
    const search = (this.searchInputTarget.value || "").trim().toLowerCase()
    if (!search) return this.users

    return this.users.filter(u => {
      const full = `${u.first_name || ""} ${u.last_name || ""} ${u.email || ""}`.toLowerCase()
      return full.includes(search)
    })
  }

  // --- Admin Toggle ---

  async toggleAdmin(event) {
    const btn = event.currentTarget
    const userId = btn.dataset.id
    const wasAdmin = btn.dataset.checked === "true"
    const nowAdmin = !wasAdmin

    // Prevent self-demotion
    if (Number(userId) === this.currentUserIdValue && !nowAdmin) {
      alert("You cannot remove your own admin access.")
      return
    }

    // Update visual immediately
    btn.dataset.checked = String(nowAdmin)
    btn.setAttribute("aria-checked", String(nowAdmin))
    btn.title = nowAdmin ? "Admin: Yes" : "Admin: No"
    btn.className = btn.className.replace(nowAdmin ? "bg-gray-300" : "bg-purple-600", nowAdmin ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowAdmin ? "translate-x-1" : "translate-x-7", nowAdmin ? "translate-x-7" : "translate-x-1")

    try {
      const response = await fetch(`${this.apiUrlValue}/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ user: { budgethq_agent: nowAdmin } })
      })
      if (response.ok) {
        const updated = await response.json()
        const idx = this.users.findIndex(u => u.id === Number(userId))
        if (idx !== -1) this.users[idx] = updated
      }
    } catch (e) {
      // Revert on error
      btn.dataset.checked = String(wasAdmin)
      btn.setAttribute("aria-checked", String(wasAdmin))
      btn.title = wasAdmin ? "Admin: Yes" : "Admin: No"
      btn.className = btn.className.replace(wasAdmin ? "bg-gray-300" : "bg-purple-600", wasAdmin ? "bg-purple-600" : "bg-gray-300")
      knob.className = knob.className.replace(wasAdmin ? "translate-x-1" : "translate-x-7", wasAdmin ? "translate-x-7" : "translate-x-1")
    }
  }

  // --- Rendering ---

  _renderAdminToggle(isAdmin, userId) {
    const bg = isAdmin ? "bg-purple-600" : "bg-gray-300"
    const knobTranslate = isAdmin ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isAdmin}" data-id="${userId}"
      data-action="click->admin-users#toggleAdmin"
      role="switch" aria-checked="${isAdmin}" title="${isAdmin ? 'Admin: Yes' : 'Admin: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  renderTable() {
    const filtered = this._getFilteredUsers()

    if (filtered.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No users found.</td></tr>`
      return
    }

    let html = ""
    for (const user of filtered) {
      html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${this._esc(user.first_name || "")}</td>
        <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">${this._esc(user.last_name || "")}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(user.email)}</td>
        <td class="px-6 py-4 text-center">${this._renderAdminToggle(user.admin, user.id)}</td>
      </tr>`
    }
    this.tableBodyTarget.innerHTML = html
  }

  _esc(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
