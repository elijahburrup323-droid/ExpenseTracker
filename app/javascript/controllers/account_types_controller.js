import { Controller } from "@hotwired/stimulus"

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = ["tableBody", "toggleAllButton"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.types = []
    this._viewAll = false
    this._editingMasterId = null
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      this.types = await res.json()
      this._syncViewAllToggle()
      this.renderTable()
    } catch (e) {
      console.error("Failed to load account types:", e)
    }
  }

  // --- View All Toggle ---

  _syncViewAllToggle() {
    const btn = this.toggleAllButtonTarget
    btn.dataset.checked = String(this._viewAll)
    btn.setAttribute("aria-checked", String(this._viewAll))
    btn.className = btn.className.replace(this._viewAll ? "bg-gray-300" : "bg-purple-600", this._viewAll ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(this._viewAll ? "translate-x-1" : "translate-x-7", this._viewAll ? "translate-x-7" : "translate-x-1")
  }

  toggleViewAll() {
    this._viewAll = !this._viewAll
    this._syncViewAllToggle()
    this.renderTable()
  }

  // --- Use Toggle ---

  _renderUseToggle(isOn, masterId) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"
    const knobX = isOn ? "translate-x-5" : "translate-x-0"
    return `<button class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent ${bg} transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      data-id="${masterId}" data-action="click->account-types#toggle" role="switch" aria-checked="${isOn}" title="${isOn ? 'Enabled' : 'Disabled'}">
      <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${knobX}"></span>
    </button>`
  }

  async toggle(event) {
    const btn = event.currentTarget
    const masterId = parseInt(btn.dataset.id)
    const type = this.types.find(t => t.account_type_master_id === masterId)
    if (!type) return

    // Optimistic UI
    const wasOn = type.is_enabled
    const nowOn = !wasOn
    type.is_enabled = nowOn
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Enabled" : "Disabled"
    btn.className = btn.className.replace(nowOn ? "bg-gray-200" : "bg-brand-600", nowOn ? "bg-brand-600" : "bg-gray-200")
    btn.className = btn.className.replace(nowOn ? "dark:bg-gray-600" : "", "")
    if (!nowOn) btn.className += " dark:bg-gray-600"
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-0" : "translate-x-5", nowOn ? "translate-x-5" : "translate-x-0")

    try {
      const res = await fetch(`${this.apiUrlValue}/${masterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ user_account_type: { is_enabled: nowOn } })
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = this.types.findIndex(t => t.account_type_master_id === masterId)
        if (idx !== -1) this.types[idx] = { ...this.types[idx], ...updated }

        // If View All is off and we just disabled a type, re-render to remove it
        if (!this._viewAll && !nowOn) this.renderTable()
      } else {
        // Revert
        type.is_enabled = wasOn
        this.renderTable()
      }
    } catch (e) {
      type.is_enabled = wasOn
      this.renderTable()
      console.error("Toggle failed:", e)
    }
  }

  // --- Click-to-Edit Description ---

  _renderDescription(t) {
    // If this row is being edited, show the input
    if (this._editingMasterId === t.account_type_master_id) {
      return `<div class="flex items-center space-x-2">
        <input type="text" value="${escapeHtml(t.custom_description || t.master_description || "")}"
          data-master-id="${t.account_type_master_id}"
          data-action="keydown->account-types#handleDescriptionKeydown"
          class="desc-input flex-1 text-sm px-2 py-1 rounded border border-brand-400 dark:border-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          maxlength="255" />
        <button data-master-id="${t.account_type_master_id}" data-action="click->account-types#saveDescription"
          class="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 transition">Save</button>
        <button data-master-id="${t.account_type_master_id}" data-action="click->account-types#cancelDescription"
          class="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition">Cancel</button>
        ${t.custom_description ? `<button data-master-id="${t.account_type_master_id}" data-action="click->account-types#resetDescription"
          class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition" title="Reset to master description">Reset</button>` : ""}
      </div>`
    }

    // Display mode: show description with click-to-edit hint
    const desc = escapeHtml(t.description || "")
    const isCustom = !!t.custom_description
    const customBadge = isCustom ? ` <span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">custom</span>` : ""
    return `<span class="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 hover:underline transition-colors"
      data-master-id="${t.account_type_master_id}" data-action="click->account-types#editDescription"
      title="Click to edit description">${desc || '<span class="italic text-gray-300 dark:text-gray-600">No description</span>'}</span>${customBadge}`
  }

  editDescription(event) {
    const masterId = parseInt(event.currentTarget.dataset.masterId)
    this._editingMasterId = masterId
    this.renderTable()

    // Focus the input after render
    requestAnimationFrame(() => {
      const input = this.tableBodyTarget.querySelector(`.desc-input[data-master-id="${masterId}"]`)
      if (input) { input.focus(); input.select() }
    })
  }

  cancelDescription() {
    this._editingMasterId = null
    this.renderTable()
  }

  async saveDescription(event) {
    const masterId = parseInt(event.currentTarget.dataset.masterId)
    const input = this.tableBodyTarget.querySelector(`.desc-input[data-master-id="${masterId}"]`)
    if (!input) return

    const newDesc = input.value.trim()
    const type = this.types.find(t => t.account_type_master_id === masterId)
    if (!type) return

    // If the description matches master, clear custom
    const customValue = (newDesc === type.master_description) ? null : newDesc

    try {
      const res = await fetch(`${this.apiUrlValue}/${masterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ user_account_type: { custom_description: customValue || "" } })
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = this.types.findIndex(t => t.account_type_master_id === masterId)
        if (idx !== -1) this.types[idx] = { ...this.types[idx], ...updated }
      }
    } catch (e) {
      console.error("Save description failed:", e)
    }

    this._editingMasterId = null
    this.renderTable()
  }

  async resetDescription(event) {
    const masterId = parseInt(event.currentTarget.dataset.masterId)

    try {
      const res = await fetch(`${this.apiUrlValue}/${masterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ user_account_type: { custom_description: "" } })
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = this.types.findIndex(t => t.account_type_master_id === masterId)
        if (idx !== -1) this.types[idx] = { ...this.types[idx], ...updated }
      }
    } catch (e) {
      console.error("Reset description failed:", e)
    }

    this._editingMasterId = null
    this.renderTable()
  }

  // --- Rendering ---

  renderTable() {
    // Filter based on View All toggle
    const visible = this._viewAll
      ? this.types
      : this.types.filter(t => t.is_enabled)

    if (visible.length === 0) {
      const msg = this._viewAll
        ? "No account types available."
        : 'No account types enabled. Toggle "View All" to see all available types.'
      this.tableBodyTarget.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">${msg}</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = visible.map(t => {
      return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(t.display_name)}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${this._renderDescription(t)}</td>
        <td class="px-6 py-4 text-center">${this._renderUseToggle(t.is_enabled, t.account_type_master_id)}</td>
      </tr>`
    }).join("")
  }

  // Handle Enter key in description input
  handleDescriptionKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      const masterId = event.currentTarget.dataset.masterId
      this.saveDescription({ currentTarget: { dataset: { masterId } } })
    } else if (event.key === "Escape") {
      this.cancelDescription()
    }
  }
}
