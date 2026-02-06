import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tableBody", "addButton", "deleteModal", "deleteModalName"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.spendingTypes = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const response = await fetch(this.apiUrlValue, {
        headers: { "Accept": "application/json" }
      })
      if (response.ok) {
        this.spendingTypes = await response.json()
      }
    } catch (e) {
      // silently fail, show empty table
    }
    this.renderTable()
  }

  // --- State Transitions ---

  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"
    this.renderTable()
    const nameInput = this.tableBodyTarget.querySelector("input[name='name']")
    if (nameInput) nameInput.focus()
  }

  cancelAdding() {
    this.state = "idle"
    this.renderTable()
  }

  async saveNew() {
    const nameInput = this.tableBodyTarget.querySelector("input[name='name']")
    const descInput = this.tableBodyTarget.querySelector("input[name='description']")
    const name = nameInput?.value?.trim()
    const description = descInput?.value?.trim()

    if (!name) {
      this.showRowError("Name is required")
      nameInput?.focus()
      return
    }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ spending_type: { name, description } })
      })

      if (response.ok) {
        const newType = await response.json()
        this.spendingTypes.push(newType)
        this.state = "idle"
        this.renderTable()
      } else {
        const data = await response.json()
        this.showRowError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this.showRowError("Network error")
    }
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    this.state = "editing"
    this.editingId = id
    this.renderTable()
    const nameInput = this.tableBodyTarget.querySelector("input[name='name']")
    if (nameInput) nameInput.focus()
  }

  cancelEditing() {
    this.state = "idle"
    this.editingId = null
    this.renderTable()
  }

  async saveEdit() {
    const nameInput = this.tableBodyTarget.querySelector("input[name='name']")
    const descInput = this.tableBodyTarget.querySelector("input[name='description']")
    const name = nameInput?.value?.trim()
    const description = descInput?.value?.trim()

    if (!name) {
      this.showRowError("Name is required")
      nameInput?.focus()
      return
    }

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ spending_type: { name, description } })
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.spendingTypes.findIndex(st => st.id === this.editingId)
        if (idx !== -1) this.spendingTypes[idx] = updated
        this.state = "idle"
        this.editingId = null
        this.renderTable()
      } else {
        const data = await response.json()
        this.showRowError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this.showRowError("Network error")
    }
  }

  confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const st = this.spendingTypes.find(s => s.id === id)
    if (!st) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = st.name
    this.deleteModalTarget.classList.remove("hidden")
    this.addButtonTarget.disabled = true
  }

  cancelDelete() {
    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  async executeDelete() {
    try {
      const response = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": this.csrfTokenValue
        }
      })

      if (response.ok || response.status === 204) {
        this.spendingTypes = this.spendingTypes.filter(st => st.id !== this.deletingId)
        this.renderTable()
      }
    } catch (e) {
      // silently fail
    }

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      if (this.state === "adding") this.saveNew()
      else if (this.state === "editing") this.saveEdit()
    } else if (event.key === "Escape") {
      event.preventDefault()
      if (this.state === "adding") this.cancelAdding()
      else if (this.state === "editing") this.cancelEditing()
    }
  }

  // --- Rendering ---

  renderTable() {
    const isIdle = this.state === "idle"
    this.addButtonTarget.disabled = !isIdle

    let html = ""

    if (this.state === "adding") {
      html += this.renderInputRow("", "")
    }

    for (const st of this.spendingTypes) {
      if (this.state === "editing" && st.id === this.editingId) {
        html += this.renderInputRow(st.name, st.description || "")
      } else {
        html += this.renderDisplayRow(st, isIdle)
      }
    }

    if (this.spendingTypes.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400">No spending types yet. Click "Add Spending Type" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  renderDisplayRow(st, actionsEnabled) {
    const disabledClass = actionsEnabled ? "" : "opacity-50 cursor-not-allowed"
    const disabledAttr = actionsEnabled ? "" : "disabled"

    return `<tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">${this.iconFor(st.icon_key, st.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${this.escapeHtml(st.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${this.escapeHtml(st.description || "")}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-brand-700 bg-brand-50 hover:bg-brand-100 transition ${disabledClass}"
                data-id="${st.id}"
                data-action="click->spending-types#startEditing"
                ${disabledAttr}>
          Edit
        </button>
        <button type="button"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition ${disabledClass}"
                data-id="${st.id}"
                data-action="click->spending-types#confirmDelete"
                ${disabledAttr}>
          Delete
        </button>
      </td>
    </tr>`
  }

  renderInputRow(name, description) {
    const isAdding = this.state === "adding"
    return `<tr class="bg-brand-50/40">
      <td class="px-6 py-3"></td>
      <td class="px-6 py-3">
        <input type="text" name="name" value="${this.escapeAttr(name)}" placeholder="Name"
               maxlength="80"
               class="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->spending-types#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <input type="text" name="description" value="${this.escapeAttr(description)}" placeholder="Description"
               maxlength="255"
               class="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->spending-types#handleKeydown">
      </td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->spending-types#${isAdding ? 'saveNew' : 'saveEdit'}">
          Save
        </button>
        <button type="button"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
                data-action="click->spending-types#${isAdding ? 'cancelAdding' : 'cancelEditing'}">
          Cancel
        </button>
      </td>
    </tr>
    <tr class="hidden" data-spending-types-target="rowError">
      <td colspan="4" class="px-6 py-2 text-sm text-red-600 bg-red-50"></td>
    </tr>`
  }

  // --- Error Display ---

  showRowError(message) {
    const errorRow = this.tableBodyTarget.querySelector("[data-spending-types-target='rowError']")
    if (errorRow) {
      errorRow.classList.remove("hidden")
      errorRow.querySelector("td").textContent = message
    }
  }

  // --- Icons ---

  iconFor(iconKey, colorKey) {
    const colors = {
      blue: "text-blue-500",
      gold: "text-yellow-500",
      green: "text-green-500"
    }
    const colorClass = colors[colorKey] || "text-gray-400"

    const icons = {
      "check-circle": `<svg class="h-5 w-5 ${colorClass}" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`,
      "star": `<svg class="h-5 w-5 ${colorClass}" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>`,
      "chart-line": `<svg class="h-5 w-5 ${colorClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
      </svg>`
    }

    return icons[iconKey] || `<svg class="h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd"/>
    </svg>`
  }

  // --- XSS Prevention ---

  escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }

  escapeAttr(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  }
}
