import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, COLOR_OPTIONS, renderIconSvg, defaultIconSvg, iconFor, escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = ["tableBody", "addButton", "generateButton", "deleteModal", "deleteModalName"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.accountTypes = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false
    this.fetchAll()

    // Close icon picker when clicking outside
    this._onDocumentClick = (e) => {
      if (this.iconPickerOpen && !e.target.closest("[data-icon-picker]")) {
        this.iconPickerOpen = false
        this._rerenderIconPicker()
      }
    }
    document.addEventListener("click", this._onDocumentClick)
  }

  disconnect() {
    document.removeEventListener("click", this._onDocumentClick)
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const response = await fetch(this.apiUrlValue, {
        headers: { "Accept": "application/json" }
      })
      if (response.ok) {
        this.accountTypes = await response.json()
      }
    } catch (e) {
      // silently fail, show empty table
    }
    this.renderTable()
  }

  // --- Generate Data ---

  async generateData() {
    if (this.state !== "idle") return
    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`
    this.addButtonTarget.disabled = true

    const dummyData = [
      { name: "Checking", description: "Everyday checking accounts", icon_key: "banknotes", color_key: "blue" },
      { name: "Savings", description: "Savings and money market", icon_key: "piggy-bank", color_key: "green" },
      { name: "Credit Card", description: "Credit card accounts", icon_key: "receipt", color_key: "red" },
      { name: "Investment", description: "Brokerage and retirement", icon_key: "chart-line", color_key: "purple" },
      { name: "Cash", description: "Physical cash on hand", icon_key: "currency", color_key: "gold" },
      { name: "Loan", description: "Personal and auto loans", icon_key: "document", color_key: "orange" },
      { name: "Mortgage", description: "Home mortgage accounts", icon_key: "home", color_key: "indigo" },
      { name: "Digital Wallet", description: "PayPal, Venmo, etc.", icon_key: "device", color_key: "teal" },
      { name: "HSA", description: "Health savings account", icon_key: "medical", color_key: "pink" },
      { name: "Emergency Fund", description: "Emergency reserves", icon_key: "shield", color_key: "gray" }
    ]

    for (const item of dummyData) {
      try {
        const response = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ account_type: item })
        })
        if (response.ok) {
          const newType = await response.json()
          this.accountTypes.push(newType)
        }
      } catch (e) {
        // skip on error
      }
    }

    btn.innerHTML = originalText
    btn.disabled = false
    this.addButtonTarget.disabled = false
    this.renderTable()
  }

  // --- State Transitions ---

  startAdding() {
    if (this.state === "adding") return
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null; this.iconPickerOpen = false }
    this.state = "adding"
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false
    this.renderTable()
    const nameInput = this.tableBodyTarget.querySelector("input[name='name']")
    if (nameInput) nameInput.focus()
  }

  cancelAdding() {
    this.state = "idle"
    this.iconPickerOpen = false
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
    if (!description) {
      this.showRowError("Description is required")
      descInput?.focus()
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
        body: JSON.stringify({ account_type: {
          name,
          description,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const newType = await response.json()
        this.accountTypes.push(newType)
        this.state = "idle"
        this.iconPickerOpen = false
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
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null; this.iconPickerOpen = false }
    const id = Number(event.currentTarget.dataset.id)
    const at = this.accountTypes.find(a => a.id === id)
    this.state = "editing"
    this.editingId = id
    this.selectedIconKey = at?.icon_key || null
    this.selectedColorKey = at?.color_key || "blue"
    this.iconPickerOpen = false
    this.renderTable()
    const nameInput = this.tableBodyTarget.querySelector("input[name='name']")
    if (nameInput) nameInput.focus()
  }

  cancelEditing() {
    this.state = "idle"
    this.editingId = null
    this.iconPickerOpen = false
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
    if (!description) {
      this.showRowError("Description is required")
      descInput?.focus()
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
        body: JSON.stringify({ account_type: {
          name,
          description,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.accountTypes.findIndex(at => at.id === this.editingId)
        if (idx !== -1) this.accountTypes[idx] = updated
        this.state = "idle"
        this.editingId = null
        this.iconPickerOpen = false
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
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null; this.iconPickerOpen = false; this.renderTable() }
    const id = Number(event.currentTarget.dataset.id)
    const at = this.accountTypes.find(a => a.id === id)
    if (!at) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = at.name
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
        this.accountTypes = this.accountTypes.filter(at => at.id !== this.deletingId)
        this.renderTable()
      }
    } catch (e) {
      // silently fail
    }

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Icon Picker ---

  toggleIconPicker(event) {
    event.stopPropagation()
    this.iconPickerOpen = !this.iconPickerOpen
    this._rerenderIconPicker()
  }

  selectIcon(event) {
    event.stopPropagation()
    const key = event.currentTarget.dataset.iconKey
    if (key) {
      this.selectedIconKey = key
      this.iconPickerOpen = false
      this._rerenderIconPicker()
      this._updateIconButtonPreview()
    }
  }

  selectColor(event) {
    event.stopPropagation()
    const key = event.currentTarget.dataset.colorKey
    if (key) {
      this.selectedColorKey = key
      this._rerenderIconPicker()
      this._updateIconButtonPreview()
    }
  }

  _rerenderIconPicker() {
    const dropdown = this.element.querySelector("[data-icon-picker-dropdown]")
    if (!dropdown) return

    if (!this.iconPickerOpen) {
      dropdown.classList.add("hidden")
      return
    }

    dropdown.classList.remove("hidden")
    dropdown.innerHTML = this._renderIconPickerContent()

    // Position fixed dropdown relative to the icon button
    const btn = dropdown.closest("[data-icon-picker]")?.querySelector("button")
    if (btn) {
      const rect = btn.getBoundingClientRect()
      dropdown.style.left = `${rect.left}px`
      dropdown.style.top = `${rect.bottom + 4}px`
    }
  }

  _updateIconButtonPreview() {
    const preview = this.element.querySelector("[data-icon-preview]")
    if (preview) {
      preview.innerHTML = this.selectedIconKey
        ? renderIconSvg(this.selectedIconKey, this.selectedColorKey, "h-5 w-5")
        : `<svg class="h-5 w-5 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
    }
  }

  _renderIconPickerContent() {
    const colorHtml = COLOR_OPTIONS.map(c => {
      const selected = c.key === this.selectedColorKey
      const ringClass = selected ? `ring-2 ${c.ring} ring-offset-1` : ""
      return `<button type="button" data-color-key="${c.key}"
        class="w-6 h-6 rounded-full ${c.bg} ${ringClass} hover:ring-2 hover:${c.ring} hover:ring-offset-1 transition flex items-center justify-center"
        data-action="click->account-types#selectColor"
        title="${c.label}">
        <span class="w-3 h-3 rounded-full ${c.css.replace('text-', 'bg-')}"></span>
      </button>`
    }).join("")

    const iconsHtml = ICON_CATALOG.map(icon => {
      const selected = icon.key === this.selectedIconKey
      const bgClass = selected ? "bg-brand-100 dark:bg-brand-900/40 ring-2 ring-brand-500" : "hover:bg-gray-100 dark:hover:bg-gray-700"
      return `<button type="button" data-icon-key="${icon.key}"
        class="p-1.5 rounded-md ${bgClass} transition flex items-center justify-center"
        data-action="click->account-types#selectIcon"
        title="${icon.label}">
        ${renderIconSvg(icon.key, this.selectedColorKey, "h-5 w-5")}
      </button>`
    }).join("")

    return `
      <div class="p-3 border-b border-gray-200 dark:border-gray-700">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Color</p>
        <div class="flex gap-1.5 flex-wrap">${colorHtml}</div>
      </div>
      <div class="p-3">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Icon</p>
        <div class="grid grid-cols-8 gap-1">${iconsHtml}</div>
      </div>`
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      if (this.state === "adding") this.saveNew()
      else if (this.state === "editing") this.saveEdit()
    } else if (event.key === "Escape") {
      event.preventDefault()
      if (this.iconPickerOpen) {
        this.iconPickerOpen = false
        this._rerenderIconPicker()
      } else if (this.state === "adding") this.cancelAdding()
      else if (this.state === "editing") this.cancelEditing()
    }
  }

  // --- Rendering ---

  renderTable() {
    const isIdle = this.state === "idle"
    this.addButtonTarget.disabled = !isIdle
    if (this.hasGenerateButtonTarget) this.generateButtonTarget.disabled = !isIdle

    let html = ""

    if (this.state === "adding") {
      html += this.renderInputRow("", "")
    }

    for (const at of this.accountTypes) {
      if (this.state === "editing" && at.id === this.editingId) {
        html += this.renderInputRow(at.name, at.description || "")
      } else {
        html += this.renderDisplayRow(at, isIdle)
      }
    }

    if (this.accountTypes.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No account types yet. Click "Add Account Type" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  renderDisplayRow(at, actionsEnabled) {
    const disabledClass = actionsEnabled ? "" : "opacity-50 cursor-not-allowed"
    const disabledAttr = actionsEnabled ? "" : "disabled"

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4">${iconFor(at.icon_key, at.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(at.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(at.description || "")}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition ${disabledClass}"
                data-id="${at.id}"
                data-action="click->account-types#startEditing"
                ${disabledAttr}
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition ${disabledClass}"
                data-id="${at.id}"
                data-action="click->account-types#confirmDelete"
                ${disabledAttr}
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  renderInputRow(name, description) {
    const isAdding = this.state === "adding"
    const previewIcon = this.selectedIconKey
      ? renderIconSvg(this.selectedIconKey, this.selectedColorKey, "h-5 w-5")
      : `<svg class="h-5 w-5 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-6 py-3">
        <div class="relative" data-icon-picker>
          <button type="button"
                  class="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  data-action="click->account-types#toggleIconPicker"
                  title="Choose icon">
            <span data-icon-preview>${previewIcon}</span>
          </button>
          <div data-icon-picker-dropdown class="hidden fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 w-80">
          </div>
        </div>
      </td>
      <td class="px-6 py-3">
        <input type="text" name="name" value="${escapeAttr(name)}" placeholder="Name"
               maxlength="80"
               class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->account-types#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <input type="text" name="description" value="${escapeAttr(description)}" placeholder="Description"
               maxlength="255"
               class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->account-types#handleKeydown">
      </td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->account-types#${isAdding ? 'saveNew' : 'saveEdit'}"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->account-types#${isAdding ? 'cancelAdding' : 'cancelEditing'}"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-account-types-target="rowError">
      <td colspan="4" class="px-6 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  // --- Error Display ---

  showRowError(message) {
    const errorRow = this.tableBodyTarget.querySelector("[data-account-types-target='rowError']")
    if (errorRow) {
      errorRow.classList.remove("hidden")
      errorRow.querySelector("td").textContent = message
    }
  }
}
