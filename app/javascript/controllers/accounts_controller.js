import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, COLOR_OPTIONS, renderIconSvg, defaultIconSvg, iconFor, escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = ["tableBody", "addButton", "deleteModal", "deleteModalName"]
  static values = { apiUrl: String, typesUrl: String, csrfToken: String }

  connect() {
    this.accounts = []
    this.accountTypes = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false
    this.fetchAll()

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
      const [accRes, typesRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.typesUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (accRes.ok) this.accounts = await accRes.json()
      if (typesRes.ok) this.accountTypes = await typesRes.json()
    } catch (e) {
      // silently fail
    }
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
    const typeSelect = this.tableBodyTarget.querySelector("select[name='account_type_id']")
    const instInput = this.tableBodyTarget.querySelector("input[name='institution']")
    const balInput = this.tableBodyTarget.querySelector("input[name='balance']")
    const name = nameInput?.value?.trim()
    const account_type_id = typeSelect?.value
    const institution = instInput?.value?.trim()
    const balance = balInput?.value?.trim() || "0"

    if (!name) {
      this.showRowError("Name is required")
      nameInput?.focus()
      return
    }
    if (!account_type_id) {
      this.showRowError("Account Type is required")
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
        body: JSON.stringify({ account: {
          name, account_type_id, institution, balance,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const newAcc = await response.json()
        this.accounts.push(newAcc)
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
    const acc = this.accounts.find(a => a.id === id)
    this.state = "editing"
    this.editingId = id
    this.selectedIconKey = acc?.icon_key || null
    this.selectedColorKey = acc?.color_key || "blue"
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
    const typeSelect = this.tableBodyTarget.querySelector("select[name='account_type_id']")
    const instInput = this.tableBodyTarget.querySelector("input[name='institution']")
    const balInput = this.tableBodyTarget.querySelector("input[name='balance']")
    const name = nameInput?.value?.trim()
    const account_type_id = typeSelect?.value
    const institution = instInput?.value?.trim()
    const balance = balInput?.value?.trim() || "0"

    if (!name) {
      this.showRowError("Name is required")
      nameInput?.focus()
      return
    }
    if (!account_type_id) {
      this.showRowError("Account Type is required")
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
        body: JSON.stringify({ account: {
          name, account_type_id, institution, balance,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey
        }})
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.accounts.findIndex(a => a.id === this.editingId)
        if (idx !== -1) this.accounts[idx] = updated
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
    const acc = this.accounts.find(a => a.id === id)
    if (!acc) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = acc.name
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
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (response.ok || response.status === 204) {
        this.accounts = this.accounts.filter(a => a.id !== this.deletingId)
        this.renderTable()
      }
    } catch (e) {}

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
        data-action="click->accounts#selectColor"
        title="${c.label}">
        <span class="w-3 h-3 rounded-full ${c.css.replace('text-', 'bg-')}"></span>
      </button>`
    }).join("")

    const iconsHtml = ICON_CATALOG.map(icon => {
      const selected = icon.key === this.selectedIconKey
      const bgClass = selected ? "bg-brand-100 dark:bg-brand-900/40 ring-2 ring-brand-500" : "hover:bg-gray-100 dark:hover:bg-gray-700"
      return `<button type="button" data-icon-key="${icon.key}"
        class="p-1.5 rounded-md ${bgClass} transition flex items-center justify-center"
        data-action="click->accounts#selectIcon"
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

  // --- Budget Toggle ---

  _renderBudgetToggle(isOn, accId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    const dataId = accId ? `data-id="${accId}"` : ""
    return `<button type="button"
      class="budget-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-brand-300"
      data-checked="${isOn}" ${dataId}
      data-action="click->accounts#toggleBudget"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'In Budget: Yes' : 'In Budget: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleBudget(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "In Budget: Yes" : "In Budget: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-brand-600", nowOn ? "bg-brand-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const accId = btn.dataset.id
    if (accId && this.state === "idle") {
      try {
        const response = await fetch(`${this.apiUrlValue}/${accId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ account: { include_in_budget: nowOn } })
        })
        if (response.ok) {
          const updated = await response.json()
          const idx = this.accounts.findIndex(a => a.id === Number(accId))
          if (idx !== -1) this.accounts[idx] = updated
        }
      } catch (e) {
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "In Budget: Yes" : "In Budget: No"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-brand-600", wasOn ? "bg-brand-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
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

    let html = ""

    if (this.state === "adding") {
      html += this.renderAddRow()
    }

    for (const acc of this.accounts) {
      if (this.state === "editing" && acc.id === this.editingId) {
        html += this.renderEditRow(acc)
      } else {
        html += this.renderDisplayRow(acc, isIdle)
      }
    }

    if (this.accounts.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No accounts yet. Click "Add Account" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  _formatBalance(balance) {
    const num = parseFloat(balance)
    if (!num && num !== 0) return "&mdash;"
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  renderDisplayRow(acc, actionsEnabled) {
    const disabledClass = actionsEnabled ? "" : "opacity-50 cursor-not-allowed"
    const disabledAttr = actionsEnabled ? "" : "disabled"
    const budgetToggle = this._renderBudgetToggle(acc.include_in_budget, acc.id)

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4">${iconFor(acc.icon_key, acc.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(acc.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(acc.account_type_name || "")}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(acc.institution || "")}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right font-mono">${this._formatBalance(acc.balance)}</td>
      <td class="px-6 py-4 text-center">${budgetToggle}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition ${disabledClass}"
                data-id="${acc.id}"
                data-action="click->accounts#startEditing"
                ${disabledAttr}
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition ${disabledClass}"
                data-id="${acc.id}"
                data-action="click->accounts#confirmDelete"
                ${disabledAttr}
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

    const typeOptions = this.accountTypes.map(at =>
      `<option value="${at.id}">${escapeHtml(at.name)}</option>`
    ).join("")

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-6 py-3">
        <div class="relative" data-icon-picker>
          <button type="button"
                  class="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  data-action="click->accounts#toggleIconPicker"
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
               class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->accounts#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <select name="account_type_id"
                class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
                data-action="keydown->accounts#handleKeydown">
          <option value="">Select type...</option>
          ${typeOptions}
        </select>
      </td>
      <td class="px-6 py-3">
        <input type="text" name="institution" value="" placeholder="Institution"
               maxlength="120"
               class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->accounts#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <div class="flex items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
          <input type="number" name="balance" value="" placeholder="0.00" step="0.01"
                 class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5 text-right"
                 data-action="keydown->accounts#handleKeydown">
        </div>
      </td>
      <td class="px-6 py-3 text-center">
        ${this._renderBudgetToggle(true)}
      </td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->accounts#saveNew"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->accounts#cancelAdding"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-accounts-target="rowError">
      <td colspan="7" class="px-6 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  renderEditRow(acc) {
    const previewIcon = this.selectedIconKey
      ? renderIconSvg(this.selectedIconKey, this.selectedColorKey, "h-5 w-5")
      : `<svg class="h-5 w-5 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`

    const typeOptions = this.accountTypes.map(at => {
      const selected = at.id === acc.account_type_id ? "selected" : ""
      return `<option value="${at.id}" ${selected}>${escapeHtml(at.name)}</option>`
    }).join("")

    const balVal = parseFloat(acc.balance) || ""

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-6 py-3">
        <div class="relative" data-icon-picker>
          <button type="button"
                  class="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  data-action="click->accounts#toggleIconPicker"
                  title="Choose icon">
            <span data-icon-preview>${previewIcon}</span>
          </button>
          <div data-icon-picker-dropdown class="hidden fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 w-80">
          </div>
        </div>
      </td>
      <td class="px-6 py-3">
        <input type="text" name="name" value="${escapeAttr(acc.name)}" placeholder="Name"
               maxlength="80"
               class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->accounts#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <select name="account_type_id"
                class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
                data-action="keydown->accounts#handleKeydown">
          <option value="">Select type...</option>
          ${typeOptions}
        </select>
      </td>
      <td class="px-6 py-3">
        <input type="text" name="institution" value="${escapeAttr(acc.institution || "")}" placeholder="Institution"
               maxlength="120"
               class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->accounts#handleKeydown">
      </td>
      <td class="px-6 py-3">
        <div class="flex items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
          <input type="number" name="balance" value="${balVal}" placeholder="0.00" step="0.01"
                 class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5 text-right"
                 data-action="keydown->accounts#handleKeydown">
        </div>
      </td>
      <td class="px-6 py-3 text-center">
        ${this._renderBudgetToggle(acc.include_in_budget)}
      </td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->accounts#saveEdit"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->accounts#cancelEditing"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-accounts-target="rowError">
      <td colspan="7" class="px-6 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  // --- Error Display ---

  showRowError(message) {
    const errorRow = this.tableBodyTarget.querySelector("[data-accounts-target='rowError']")
    if (errorRow) {
      errorRow.classList.remove("hidden")
      errorRow.querySelector("td").textContent = message
    }
  }
}
