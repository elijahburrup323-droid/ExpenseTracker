import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, COLOR_OPTIONS, renderIconSvg, defaultIconSvg, iconFor, escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = ["tableBody", "addButton", "generateButton", "deleteModal", "deleteModalName"]
  static values = { apiUrl: String, typesUrl: String, csrfToken: String, typesPageUrl: String }

  connect() {
    this.categories = []
    this.spendingTypes = []
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
      const [catRes, typesRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.typesUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (catRes.ok) this.categories = await catRes.json()
      if (typesRes.ok) this.spendingTypes = await typesRes.json()
    } catch (e) {
      // silently fail, show empty table
    }
    this.renderTable()
  }

  // --- Generate Data ---

  async generateData() {
    if (this.state !== "idle") return
    if (this.spendingTypes.length === 0) {
      alert("Please generate Spending Types first before generating categories.")
      return
    }

    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`
    this.addButtonTarget.disabled = true

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

    const dummyData = [
      { name: "Groceries", description: "Supermarket and food shopping", is_debt: false, icon_key: "shopping-bag", color_key: "green" },
      { name: "Gas", description: "Fuel for vehicles", is_debt: false, icon_key: "car", color_key: "gold" },
      { name: "Netflix", description: "Streaming subscription", is_debt: false, icon_key: "film", color_key: "red" },
      { name: "Rent", description: "Monthly rent payment", is_debt: false, icon_key: "home", color_key: "blue" },
      { name: "Doctor Visit", description: "Medical appointments", is_debt: false, icon_key: "medical", color_key: "pink" },
      { name: "Student Loan", description: "Education loan payment", is_debt: true, icon_key: "academic", color_key: "indigo" },
      { name: "Credit Card Payment", description: "Monthly credit card bill", is_debt: true, icon_key: "receipt", color_key: "red" },
      { name: "Electric Bill", description: "Monthly electricity", is_debt: false, icon_key: "lightning", color_key: "orange" },
      { name: "Gym Membership", description: "Monthly gym fee", is_debt: false, icon_key: "heart", color_key: "teal" },
      { name: "Clothing", description: "Apparel and accessories", is_debt: false, icon_key: "shopping-bag", color_key: "purple" }
    ]

    for (const item of dummyData) {
      const type = pick(this.spendingTypes)
      try {
        const response = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ spending_category: { ...item, spending_type_id: type.id } })
        })
        if (response.ok) {
          const newCat = await response.json()
          this.categories.push(newCat)
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
    const typeSelect = this.tableBodyTarget.querySelector("select[name='spending_type_id']")
    const debtToggle = this.tableBodyTarget.querySelector(".debt-toggle")
    const name = nameInput?.value?.trim()
    const description = descInput?.value?.trim()
    const spending_type_id = typeSelect?.value
    const is_debt = debtToggle?.dataset.checked === "true"

    if (!name) {
      this.showRowError("Name is required")
      nameInput?.focus()
      return
    }

    if (!spending_type_id || spending_type_id === "new") {
      this.showRowError("Spending Type is required — select an existing type or refresh after creating one")
      typeSelect?.focus()
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
        body: JSON.stringify({ spending_category: {
          name,
          description,
          spending_type_id,
          is_debt,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const newCat = await response.json()
        this.categories.push(newCat)
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
    const cat = this.categories.find(c => c.id === id)
    this.state = "editing"
    this.editingId = id
    this.selectedIconKey = cat?.icon_key || null
    this.selectedColorKey = cat?.color_key || "blue"
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
    const typeSelect = this.tableBodyTarget.querySelector("select[name='spending_type_id']")
    const debtToggle = this.tableBodyTarget.querySelector(".debt-toggle")
    const name = nameInput?.value?.trim()
    const description = descInput?.value?.trim()
    const spending_type_id = typeSelect?.value
    const is_debt = debtToggle?.dataset.checked === "true"

    if (!name) {
      this.showRowError("Name is required")
      nameInput?.focus()
      return
    }

    if (!spending_type_id || spending_type_id === "new") {
      this.showRowError("Spending Type is required — select an existing type or refresh after creating one")
      typeSelect?.focus()
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
        body: JSON.stringify({ spending_category: {
          name,
          description,
          spending_type_id,
          is_debt,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.categories.findIndex(c => c.id === this.editingId)
        if (idx !== -1) this.categories[idx] = updated
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
    const cat = this.categories.find(c => c.id === id)
    if (!cat) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = cat.name
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
        this.categories = this.categories.filter(c => c.id !== this.deletingId)
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
        data-action="click->spending-categories#selectColor"
        title="${c.label}">
        <span class="w-3 h-3 rounded-full ${c.css.replace('text-', 'bg-')}"></span>
      </button>`
    }).join("")

    const iconsHtml = ICON_CATALOG.map(icon => {
      const selected = icon.key === this.selectedIconKey
      const bgClass = selected ? "bg-brand-100 dark:bg-brand-900/40 ring-2 ring-brand-500" : "hover:bg-gray-100 dark:hover:bg-gray-700"
      return `<button type="button" data-icon-key="${icon.key}"
        class="p-1.5 rounded-md ${bgClass} transition flex items-center justify-center"
        data-action="click->spending-categories#selectIcon"
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
    let html = ""

    if (this.state === "adding") {
      html += this.renderAddRow()
    }

    for (const cat of this.categories) {
      if (this.state === "editing" && cat.id === this.editingId) {
        html += this.renderEditRow(cat)
      } else {
        html += this.renderDisplayRow(cat)
      }
    }

    if (this.categories.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No spending categories yet. Click "Add Spending Category" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  renderDisplayRow(cat) {
    const debtToggle = this._renderDebtToggle(cat.is_debt, cat.id)

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4">${iconFor(cat.icon_key, cat.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(cat.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(cat.description || "")}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 w-48 max-w-[12rem] truncate">${escapeHtml(cat.spending_type_name || "")}</td>
      <td class="px-6 py-4 text-center">${debtToggle}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${cat.id}"
                data-action="click->spending-categories#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${cat.id}"
                data-action="click->spending-categories#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  renderAddRow() {
    const previewIcon = this.selectedIconKey
      ? renderIconSvg(this.selectedIconKey, this.selectedColorKey, "h-5 w-5")
      : `<svg class="h-5 w-5 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`

    const typeOptions = this.spendingTypes.map(st =>
      `<option value="${st.id}">${escapeHtml(st.name)}</option>`
    ).join("")

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-6 py-3">
        <div class="relative" data-icon-picker>
          <button type="button"
                  class="p-1.5 rounded-md border border-gray-900 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  data-action="click->spending-categories#toggleIconPicker"
                  title="Choose icon">
            <span data-icon-preview>${previewIcon}</span>
          </button>
          <div data-icon-picker-dropdown class="hidden fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 w-80">
          </div>
        </div>
      </td>
      <td class="px-6 py-3">
        <input type="text" name="name" value="" placeholder="Name"
               maxlength="80"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->spending-categories#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <input type="text" name="description" value="" placeholder="Description"
               maxlength="255"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->spending-categories#handleKeydown">
      </td>
      <td class="px-6 py-3 w-48">
        <select name="spending_type_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
                data-action="keydown->spending-categories#handleKeydown change->spending-categories#handleNewDropdown">
          <option value="">Select type...</option>
          <option value="new">&mdash; New Spending Type &mdash;</option>
          ${typeOptions}
        </select>
      </td>
      <td class="px-6 py-3 text-center">
        ${this._renderDebtToggle(false)}
      </td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->spending-categories#saveNew"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->spending-categories#cancelAdding"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-spending-categories-target="rowError">
      <td colspan="6" class="px-6 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  renderEditRow(cat) {
    const previewIcon = this.selectedIconKey
      ? renderIconSvg(this.selectedIconKey, this.selectedColorKey, "h-5 w-5")
      : `<svg class="h-5 w-5 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`

    const typeOptions = this.spendingTypes.map(st => {
      const selected = st.id === cat.spending_type_id ? "selected" : ""
      return `<option value="${st.id}" ${selected}>${escapeHtml(st.name)}</option>`
    }).join("")

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-6 py-3">
        <div class="relative" data-icon-picker>
          <button type="button"
                  class="p-1.5 rounded-md border border-gray-900 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  data-action="click->spending-categories#toggleIconPicker"
                  title="Choose icon">
            <span data-icon-preview>${previewIcon}</span>
          </button>
          <div data-icon-picker-dropdown class="hidden fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 w-80">
          </div>
        </div>
      </td>
      <td class="px-6 py-3">
        <input type="text" name="name" value="${escapeAttr(cat.name)}" placeholder="Name"
               maxlength="80"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->spending-categories#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <input type="text" name="description" value="${escapeAttr(cat.description || "")}" placeholder="Description"
               maxlength="255"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->spending-categories#handleKeydown">
      </td>
      <td class="px-6 py-3 w-48">
        <select name="spending_type_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
                data-action="keydown->spending-categories#handleKeydown change->spending-categories#handleNewDropdown">
          <option value="">Select type...</option>
          <option value="new">&mdash; New Spending Type &mdash;</option>
          ${typeOptions}
        </select>
      </td>
      <td class="px-6 py-3 text-center">
        ${this._renderDebtToggle(cat.is_debt)}
      </td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->spending-categories#saveEdit"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->spending-categories#cancelEditing"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-spending-categories-target="rowError">
      <td colspan="6" class="px-6 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  _renderDebtToggle(isOn, catId = null) {
    const bg = isOn ? "bg-purple-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    const dataId = catId ? `data-id="${catId}"` : ""
    return `<button type="button"
      class="debt-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isOn}" ${dataId}
      data-action="click->spending-categories#toggleDebt"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Debt: Yes' : 'Debt: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleDebt(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    // Update visual state immediately
    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Debt: Yes" : "Debt: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-purple-600", nowOn ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    // If in display mode (has data-id), make an API call
    const catId = btn.dataset.id
    if (catId && this.state === "idle") {
      try {
        const response = await fetch(`${this.apiUrlValue}/${catId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ spending_category: { is_debt: nowOn } })
        })
        if (response.ok) {
          const updated = await response.json()
          const idx = this.categories.findIndex(c => c.id === Number(catId))
          if (idx !== -1) this.categories[idx] = updated
        }
      } catch (e) {
        // Revert on error
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "Debt: Yes" : "Debt: No"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-purple-600", wasOn ? "bg-purple-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
  }

  // --- "New" Dropdown Handler ---

  handleNewDropdown(event) {
    if (event.target.value !== "new") return
    if (this.hasTypesPageUrlValue) this._openInNewTab(this.typesPageUrlValue)
  }

  // Safari blocks window.open from non-direct user gestures; anchor click works reliably
  _openInNewTab(url) {
    const a = document.createElement("a")
    a.href = url
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // --- Error Display ---

  showRowError(message) {
    const errorRow = this.tableBodyTarget.querySelector("[data-spending-categories-target='rowError']")
    if (errorRow) {
      errorRow.classList.remove("hidden")
      errorRow.querySelector("td").textContent = message
    }
  }
}
