import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, COLOR_OPTIONS, renderIconSvg, defaultIconSvg, iconFor, escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "generateButton",
    "deleteModal", "deleteModalName",
    "typeModal", "modalTitle", "modalName", "modalDescription",
    "modalIconPicker", "modalError"
  ]
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
    this._unregisterModalEscape()
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

  // --- Modal State Transitions ---

  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false

    this.modalTitleTarget.textContent = "Add Account Type"
    this.modalNameTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this._updateModalIconPreview()
    this._hideModalError()
    this.typeModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    this.modalNameTarget.focus()
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const at = this.accountTypes.find(a => a.id === id)
    if (!at) return

    this.state = "editing"
    this.editingId = id
    this.selectedIconKey = at.icon_key || null
    this.selectedColorKey = at.color_key || "blue"
    this.iconPickerOpen = false

    this.modalTitleTarget.textContent = "Edit Account Type"
    this.modalNameTarget.value = at.name || ""
    this.modalDescriptionTarget.value = at.description || ""
    this._updateModalIconPreview()
    this._hideModalError()
    this.typeModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    this.modalNameTarget.focus()
  }

  cancelModal() {
    this.typeModalTarget.classList.add("hidden")
    this.state = "idle"
    this.editingId = null
    this.iconPickerOpen = false
    this._unregisterModalEscape()
  }

  saveModal() {
    if (this.state === "adding") this.saveNew()
    else if (this.state === "editing") this.saveEdit()
  }

  async saveNew() {
    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()

    if (!name) {
      this._showModalError("Name is required")
      this.modalNameTarget.focus()
      return
    }
    if (!description) {
      this._showModalError("Description is required")
      this.modalDescriptionTarget.focus()
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
          name, description,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const newType = await response.json()
        this.accountTypes.push(newType)
        this.cancelModal()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  async saveEdit() {
    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()

    if (!name) {
      this._showModalError("Name is required")
      this.modalNameTarget.focus()
      return
    }
    if (!description) {
      this._showModalError("Description is required")
      this.modalDescriptionTarget.focus()
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
          name, description,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.accountTypes.findIndex(at => at.id === this.editingId)
        if (idx !== -1) this.accountTypes[idx] = updated
        this.cancelModal()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  // --- Delete ---

  confirmDelete(event) {
    if (this.state !== "idle") return
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
          "X-CSRF-Token": this.csrfTokenValue,
          "Accept": "application/json"
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
      this._updateModalIconPreview()
    }
  }

  selectColor(event) {
    event.stopPropagation()
    const key = event.currentTarget.dataset.colorKey
    if (key) {
      this.selectedColorKey = key
      this._rerenderIconPicker()
      this._updateModalIconPreview()
    }
  }

  _rerenderIconPicker() {
    const container = this.hasModalIconPickerTarget ? this.modalIconPickerTarget : this.element
    const dropdown = container.querySelector("[data-icon-picker-dropdown]")
    if (!dropdown) return

    if (!this.iconPickerOpen) {
      dropdown.classList.add("hidden")
      return
    }

    dropdown.classList.remove("hidden")
    dropdown.innerHTML = this._renderIconPickerContent()

    const btn = dropdown.closest("[data-icon-picker]")?.querySelector("button")
    if (btn) {
      const rect = btn.getBoundingClientRect()
      dropdown.style.left = `${rect.left}px`
      dropdown.style.top = `${rect.bottom + 4}px`
    }
  }

  _updateModalIconPreview() {
    const container = this.hasModalIconPickerTarget ? this.modalIconPickerTarget : this.element
    const preview = container.querySelector("[data-icon-preview]")
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

  // --- Use Toggle ---

  _renderUseToggle(isOn, atId) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="use-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-brand-300"
      data-checked="${isOn}" data-id="${atId}"
      data-action="click->account-types#toggleUse"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'In Use: Yes' : 'In Use: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleUse(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "In Use: Yes" : "In Use: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-brand-600", nowOn ? "bg-brand-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const atId = btn.dataset.id
    if (atId) {
      try {
        const response = await fetch(`${this.apiUrlValue}/${atId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ account_type: { use_flag: nowOn } })
        })
        if (response.ok) {
          const updated = await response.json()
          const idx = this.accountTypes.findIndex(a => a.id === Number(atId))
          if (idx !== -1) this.accountTypes[idx] = updated
        }
      } catch (e) {
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "In Use: Yes" : "In Use: No"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-brand-600", wasOn ? "bg-brand-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
  }

  // --- Keyboard & Escape ---

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.saveModal()
    } else if (event.key === "Escape") {
      event.preventDefault()
      if (this.iconPickerOpen) {
        this.iconPickerOpen = false
        this._rerenderIconPicker()
      } else {
        this.cancelModal()
      }
    }
  }

  _registerModalEscape() {
    this._escHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (this.iconPickerOpen) {
          this.iconPickerOpen = false
          this._rerenderIconPicker()
        } else {
          this.cancelModal()
        }
      }
    }
    document.addEventListener("keydown", this._escHandler)
  }

  _unregisterModalEscape() {
    if (this._escHandler) {
      document.removeEventListener("keydown", this._escHandler)
      this._escHandler = null
    }
  }

  // --- Error Display ---

  _showModalError(message) {
    this.modalErrorTarget.textContent = message
    this.modalErrorTarget.classList.remove("hidden")
  }

  _hideModalError() {
    this.modalErrorTarget.textContent = ""
    this.modalErrorTarget.classList.add("hidden")
  }

  // --- Rendering ---

  renderTable() {
    let html = ""

    for (const at of this.accountTypes) {
      html += this.renderDisplayRow(at)
    }

    if (this.accountTypes.length === 0) {
      html = `<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No account types yet. Click "Add Account Type" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  renderDisplayRow(at) {
    const useToggle = this._renderUseToggle(at.use_flag, at.id)
    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4">${iconFor(at.icon_key, at.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(at.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(at.description || "")}</td>
      <td class="px-6 py-4 text-center">${useToggle}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${at.id}"
                data-action="click->account-types#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${at.id}"
                data-action="click->account-types#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }
}
