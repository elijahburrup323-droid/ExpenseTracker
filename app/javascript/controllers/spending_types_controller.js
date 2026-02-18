import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, COLOR_OPTIONS, renderIconSvg, defaultIconSvg, iconFor, escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "generateButton",
    "deleteModal", "deleteModalName",
    "typeModal", "modalTitle", "modalName", "modalDescription",
    "modalIconPicker", "modalError",
    "limitModal", "limitModalName", "limitModalValue", "limitModalError", "limitModalRemoveBtn"
  ]
  static values = { apiUrl: String, limitsUrl: String, csrfToken: String }

  connect() {
    this.spendingTypes = []
    this.limits = {}
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this.limitScopeId = null
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
        this.spendingTypes = await response.json()
      }
    } catch (e) {
      // silently fail, show empty table
    }
    await this._fetchLimits()
    this.renderTable()
  }

  async _fetchLimits() {
    if (!this.limitsUrlValue) return
    try {
      const yyyymm = this._currentYYYYMM()
      const res = await fetch(`${this.limitsUrlValue}?scope_type=SPENDING_TYPE&yyyymm=${yyyymm}`, {
        headers: { "Accept": "application/json" }
      })
      if (res.ok) {
        this.limits = await res.json()
      }
    } catch (e) {
      this.limits = {}
    }
  }

  _currentYYYYMM() {
    const now = new Date()
    return now.getFullYear() * 100 + (now.getMonth() + 1)
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
      { name: "Housing", description: "Rent, mortgage, and home expenses", icon_key: "home", color_key: "blue" },
      { name: "Food & Dining", description: "Groceries and restaurants", icon_key: "utensils", color_key: "green" },
      { name: "Transportation", description: "Gas, car, and public transit", icon_key: "car", color_key: "gold" },
      { name: "Entertainment", description: "Movies, games, and hobbies", icon_key: "film", color_key: "purple" },
      { name: "Healthcare", description: "Medical and dental expenses", icon_key: "medical", color_key: "red" },
      { name: "Shopping", description: "Clothing and personal items", icon_key: "shopping-bag", color_key: "pink" },
      { name: "Utilities", description: "Electric, water, and internet", icon_key: "lightning", color_key: "orange" },
      { name: "Education", description: "Tuition, books, and courses", icon_key: "academic", color_key: "indigo" },
      { name: "Savings", description: "Emergency fund and investments", icon_key: "piggy-bank", color_key: "teal" },
      { name: "Personal Care", description: "Gym, haircuts, and wellness", icon_key: "heart", color_key: "gray" }
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
          body: JSON.stringify({ spending_type: item })
        })
        if (response.ok) {
          const newType = await response.json()
          this.spendingTypes.push(newType)
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

    this.modalTitleTarget.textContent = "Add Spending Type"
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
    const st = this.spendingTypes.find(s => s.id === id)
    if (!st) return

    this.state = "editing"
    this.editingId = id
    this.selectedIconKey = st.icon_key || null
    this.selectedColorKey = st.color_key || "blue"
    this.iconPickerOpen = false

    this.modalTitleTarget.textContent = "Edit Spending Type"
    this.modalNameTarget.value = st.name || ""
    this.modalDescriptionTarget.value = st.description || ""
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
        body: JSON.stringify({ spending_type: {
          name, description,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const newType = await response.json()
        this.spendingTypes.push(newType)
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
        body: JSON.stringify({ spending_type: {
          name, description,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.spendingTypes.findIndex(st => st.id === this.editingId)
        if (idx !== -1) this.spendingTypes[idx] = updated
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
          "X-CSRF-Token": this.csrfTokenValue,
          "Accept": "application/json"
        }
      })

      if (response.ok || response.status === 204) {
        this.spendingTypes = this.spendingTypes.filter(st => st.id !== this.deletingId)
        this.renderTable()
      } else if (response.status === 422) {
        const data = await response.json()
        alert(data.errors?.[0] || "Cannot delete this spending type.")
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
        data-action="click->spending-types#selectColor"
        title="${c.label}">
        <span class="w-3 h-3 rounded-full ${c.css.replace('text-', 'bg-')}"></span>
      </button>`
    }).join("")

    const iconsHtml = ICON_CATALOG.map(icon => {
      const selected = icon.key === this.selectedIconKey
      const bgClass = selected ? "bg-brand-100 dark:bg-brand-900/40 ring-2 ring-brand-500" : "hover:bg-gray-100 dark:hover:bg-gray-700"
      return `<button type="button" data-icon-key="${icon.key}"
        class="p-1.5 rounded-md ${bgClass} transition flex items-center justify-center"
        data-action="click->spending-types#selectIcon"
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

    for (const st of this.spendingTypes) {
      html += this.renderDisplayRow(st)
    }

    if (this.spendingTypes.length === 0) {
      html = `<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No spending types yet. Click "Add Spending Type" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  renderDisplayRow(st) {
    const limit = this.limits[String(st.id)]
    const limitHtml = limit
      ? `<span class="text-sm font-semibold text-purple-600 dark:text-purple-400">${limit.limit_value}%</span>
         <button type="button" class="ml-1 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                 data-id="${st.id}" data-action="click->spending-types#startSettingLimit" title="Edit limit">
           <svg class="h-3.5 w-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
         </button>`
      : `<button type="button" class="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                 data-id="${st.id}" data-action="click->spending-types#startSettingLimit">Set</button>`

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4">${iconFor(st.icon_key, st.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(st.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(st.description || "")}</td>
      <td class="px-6 py-4 text-center">${limitHtml}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${st.id}"
                data-action="click->spending-types#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${st.id}"
                data-action="click->spending-types#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  // --- Limit Modal ---

  startSettingLimit(event) {
    const id = Number(event.currentTarget.dataset.id)
    const st = this.spendingTypes.find(s => s.id === id)
    if (!st) return

    this.limitScopeId = id
    this.limitModalNameTarget.textContent = st.name
    const existing = this.limits[String(id)]
    this.limitModalValueTarget.value = existing ? existing.limit_value : ""
    this.limitModalErrorTarget.classList.add("hidden")

    if (existing) {
      this.limitModalRemoveBtnTarget.classList.remove("hidden")
    } else {
      this.limitModalRemoveBtnTarget.classList.add("hidden")
    }

    this.limitModalTarget.classList.remove("hidden")
    this.limitModalValueTarget.focus()
  }

  closeLimitModal() {
    this.limitModalTarget.classList.add("hidden")
    this.limitScopeId = null
  }

  handleLimitKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.saveLimitModal()
    } else if (event.key === "Escape") {
      event.preventDefault()
      this.closeLimitModal()
    }
  }

  async saveLimitModal() {
    const value = parseFloat(this.limitModalValueTarget.value)
    if (isNaN(value) || value <= 0 || value > 100) {
      this.limitModalErrorTarget.textContent = "Enter a value between 0.1 and 100"
      this.limitModalErrorTarget.classList.remove("hidden")
      return
    }

    try {
      const res = await fetch(this.limitsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ spending_limit: {
          scope_type: "SPENDING_TYPE",
          scope_id: this.limitScopeId,
          limit_value: value
        }})
      })

      if (res.ok) {
        this.closeLimitModal()
        await this._fetchLimits()
        this.renderTable()
      } else {
        const data = await res.json()
        this.limitModalErrorTarget.textContent = (data.errors || ["Save failed"]).join(", ")
        this.limitModalErrorTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.limitModalErrorTarget.textContent = "Network error"
      this.limitModalErrorTarget.classList.remove("hidden")
    }
  }

  async removeLimitModal() {
    const existing = this.limits[String(this.limitScopeId)]
    if (!existing) return

    try {
      const res = await fetch(`${this.limitsUrlValue}/${existing.id}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": this.csrfTokenValue,
          "Accept": "application/json"
        }
      })

      if (res.ok || res.status === 204) {
        this.closeLimitModal()
        await this._fetchLimits()
        this.renderTable()
      }
    } catch (e) {
      // silently fail
    }
  }
}
