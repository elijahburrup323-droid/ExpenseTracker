import { Controller } from "@hotwired/stimulus"

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = [
    "tableBody", "toggleAllButton",
    "modal", "modalTitle", "modalName", "modalDescription", "modalError",
    "deleteModal", "deleteModalName", "deleteModalError"
  ]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.types = []
    this._viewAll = false
    this._editingMasterId = null
    this._modalEditingMasterId = null
    this._deletingMasterId = null
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
    btn.className = btn.className.replace(this._viewAll ? "bg-gray-300" : "bg-brand-600", this._viewAll ? "bg-brand-600" : "bg-gray-300")
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
      const editValue = t.is_custom ? (t.master_description || "") : (t.custom_description || t.master_description || "")
      return `<div class="flex items-center space-x-2">
        <input type="text" value="${escapeHtml(editValue)}"
          data-master-id="${t.account_type_master_id}"
          data-action="keydown->account-types#handleDescriptionKeydown"
          class="desc-input flex-1 text-sm px-2 py-1 rounded border border-brand-400 dark:border-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          maxlength="255" />
        <button data-master-id="${t.account_type_master_id}" data-action="click->account-types#saveDescription"
          class="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 transition">Save</button>
        <button data-master-id="${t.account_type_master_id}" data-action="click->account-types#cancelDescription"
          class="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition">Cancel</button>
        ${!t.is_custom && t.custom_description ? `<button data-master-id="${t.account_type_master_id}" data-action="click->account-types#resetDescription"
          class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition" title="Reset to master description">Reset</button>` : ""}
      </div>`
    }

    // Display mode: show description with click-to-edit hint
    const desc = escapeHtml(t.description || "")
    const isCustomDesc = !t.is_custom && !!t.custom_description
    const customBadge = isCustomDesc ? ` <span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">custom</span>` : ""
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

    // For custom types, update the master description directly
    // For system types, update the custom_description on the UAT
    const body = type.is_custom
      ? { user_account_type: { description: newDesc } }
      : { user_account_type: { custom_description: (newDesc === type.master_description) ? "" : newDesc } }

    try {
      const res = await fetch(`${this.apiUrlValue}/${masterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify(body)
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

  // --- Custom Type Modal ---

  openAddModal() {
    this._modalEditingMasterId = null
    this.modalTitleTarget.textContent = "Add Custom Type"
    this.modalNameTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalTarget.classList.remove("hidden")
    this.modalNameTarget.focus()
  }

  openEditModal(event) {
    const masterId = parseInt(event.currentTarget.dataset.id)
    const type = this.types.find(t => t.account_type_master_id === masterId)
    if (!type || !type.is_custom) return

    this._modalEditingMasterId = masterId
    this.modalTitleTarget.textContent = "Edit Custom Type"
    this.modalNameTarget.value = type.display_name
    this.modalDescriptionTarget.value = type.master_description || ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalTarget.classList.remove("hidden")
    this.modalNameTarget.focus()
  }

  closeModal() {
    this.modalTarget.classList.add("hidden")
    this._modalEditingMasterId = null
  }

  modalKeydown(event) {
    if (event.key === "Enter") { event.preventDefault(); this.saveModal() }
    if (event.key === "Escape") { this.closeModal() }
  }

  async saveModal() {
    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()

    if (!name) { this._showModalError("Name is required."); return }

    const body = { user_account_type: { display_name: name, description: description || null } }

    const isEdit = !!this._modalEditingMasterId
    const url = isEdit ? `${this.apiUrlValue}/${this._modalEditingMasterId}` : this.apiUrlValue
    const method = isEdit ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        this.closeModal()
        this.fetchAll()
      } else {
        const data = await res.json()
        this._showModalError((data.errors || ["Save failed"]).join(", "))
      }
    } catch (e) {
      this._showModalError("Network error.")
    }
  }

  _showModalError(msg) {
    this.modalErrorTarget.textContent = msg
    this.modalErrorTarget.classList.remove("hidden")
  }

  // --- Delete Custom Type ---

  confirmDelete(event) {
    const masterId = parseInt(event.currentTarget.dataset.id)
    const type = this.types.find(t => t.account_type_master_id === masterId)
    if (!type || !type.is_custom) return

    this._deletingMasterId = masterId
    this.deleteModalNameTarget.textContent = type.display_name
    this.deleteModalErrorTarget.classList.add("hidden")
    this.deleteModalTarget.classList.remove("hidden")
  }

  closeDeleteModal() {
    this.deleteModalTarget.classList.add("hidden")
    this._deletingMasterId = null
  }

  async executeDelete() {
    if (!this._deletingMasterId) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${this._deletingMasterId}`, {
        method: "DELETE",
        headers: { "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue }
      })

      if (res.ok || res.status === 204) {
        this.closeDeleteModal()
        this.fetchAll()
      } else {
        const data = await res.json()
        const msg = (data.errors || ["Delete failed"]).join(", ")
        this.deleteModalErrorTarget.textContent = msg
        this.deleteModalErrorTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.deleteModalErrorTarget.textContent = "Network error."
      this.deleteModalErrorTarget.classList.remove("hidden")
    }
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
      this.tableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">${msg}</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = visible.map(t => {
      const customBadge = t.is_custom
        ? ` <span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">Custom</span>`
        : ""

      const actions = t.is_custom
        ? `<button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                  data-id="${t.account_type_master_id}" data-action="click->account-types#openEditModal" title="Edit">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                  data-id="${t.account_type_master_id}" data-action="click->account-types#confirmDelete" title="Delete">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>`
        : `<span class="text-gray-300 dark:text-gray-600 text-xs">—</span>`

      return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(t.display_name)}${customBadge}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${this._renderDescription(t)}</td>
        <td class="px-6 py-4 text-center">${this._renderUseToggle(t.is_enabled, t.account_type_master_id)}</td>
        <td class="px-6 py-4 text-center space-x-1 whitespace-nowrap">${actions}</td>
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
