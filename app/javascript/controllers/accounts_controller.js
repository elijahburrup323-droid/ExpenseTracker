import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, COLOR_OPTIONS, renderIconSvg, defaultIconSvg, iconFor, escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "tableHead", "addButton", "generateButton", "deleteModal", "deleteModalName",
    "blockedDeleteModal", "blockedDeleteBody", "blockedDeleteButtons", "total",
    "monthClosedModal", "monthClosedMessage",
    "accountModal", "modalTitle", "modalName", "modalDate", "modalDateRow",
    "modalType", "modalInstitution", "modalBalance", "modalBudget",
    "modalIconPicker", "modalError"
  ]
  static values = { apiUrl: String, typesUrl: String, csrfToken: String, typesPageUrl: String, depositsPageUrl: String, paymentsPageUrl: String, openMonthUrl: String, reconciliationUrl: String }

  connect() {
    this.accounts = []
    this.accountTypes = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false
    this.sortField = null
    this.sortDir = "asc"
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
    if (this._modalEscapeHandler) {
      document.removeEventListener("keydown", this._modalEscapeHandler)
    }
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

  // --- Generate Data ---

  async generateData() {
    if (this.state !== "idle") return
    if (this.accountTypes.length === 0) {
      alert("Please generate Account Types first before generating accounts.")
      return
    }

    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`
    this.addButtonTarget.disabled = true

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const randBal = () => (Math.random() * 14500 + 500).toFixed(2)

    const institutions = ["Chase", "Wells Fargo", "Bank of America", "Ally Bank", "Capital One", "Citi", "US Bank", "PNC", "TD Bank", "Discover"]

    const dummyData = [
      { name: "Main Checking", icon_key: "banknotes", color_key: "blue" },
      { name: "Vacation Fund", icon_key: "piggy-bank", color_key: "green" },
      { name: "Visa Platinum", icon_key: "receipt", color_key: "red" },
      { name: "Roth IRA", icon_key: "chart-line", color_key: "purple" },
      { name: "Wallet Cash", icon_key: "currency", color_key: "gold" },
      { name: "Auto Loan", icon_key: "car", color_key: "orange" },
      { name: "Home Mortgage", icon_key: "home", color_key: "indigo" },
      { name: "PayPal", icon_key: "device", color_key: "teal" },
      { name: "Health Savings", icon_key: "medical", color_key: "pink" },
      { name: "Emergency Reserve", icon_key: "shield", color_key: "gray" }
    ]

    for (let i = 0; i < dummyData.length; i++) {
      const item = dummyData[i]
      const type = pick(this.accountTypes)
      try {
        const response = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ account: {
            name: item.name,
            account_type_master_id: type.account_type_master_id,
            institution: institutions[i],
            balance: randBal(),
            icon_key: item.icon_key,
            color_key: item.color_key
          }})
        })
        if (response.ok) {
          const newAcc = await response.json()
          this.accounts.push(newAcc)
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

  // --- Modal Operations ---

  async startAdding() {
    if (this.state !== "idle") return

    const closed = await this._checkMonthClosed()
    if (closed) return

    // Fetch open month for date constraints
    this._openMonth = null
    if (this.openMonthUrlValue) {
      try {
        const res = await fetch(this.openMonthUrlValue, { headers: { "Accept": "application/json" } })
        if (res.ok) this._openMonth = await res.json()
      } catch (e) {}
    }

    this.state = "adding"
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false

    // Set modal title
    this.modalTitleTarget.textContent = "Add Account"

    // Reset fields
    this.modalNameTarget.value = ""
    this.modalInstitutionTarget.value = ""
    this.modalBalanceTarget.value = ""

    // Date field: visible in add mode, constrained to open month
    this.modalDateRowTarget.classList.remove("hidden")
    if (this._openMonth) {
      const y = this._openMonth.current_year
      const m = this._openMonth.current_month
      const dateMin = `${y}-${String(m).padStart(2, "0")}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const dateMax = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
      const today = new Date()
      let dateDefault
      if (today.getFullYear() === y && (today.getMonth() + 1) === m) {
        dateDefault = `${y}-${String(m).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
      } else {
        dateDefault = dateMax
      }
      this.modalDateTarget.min = dateMin
      this.modalDateTarget.max = dateMax
      this.modalDateTarget.value = dateDefault
    } else {
      this.modalDateTarget.min = ""
      this.modalDateTarget.max = ""
      this.modalDateTarget.value = ""
    }

    // Rebuild type dropdown with active types
    this._rebuildTypeDropdown()

    // Budget toggle: default ON
    this.modalBudgetTarget.innerHTML = this._renderBudgetToggle(true)

    // Update icon preview in modal
    this._updateModalIconPreview()

    // Hide error
    this.modalErrorTarget.classList.add("hidden")

    // Show modal
    this.accountModalTarget.classList.remove("hidden")
    this._registerModalEscape()

    // Focus name
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  async startEditing(event) {
    if (this.state !== "idle") return

    // Capture id before any await (event.currentTarget is null after async)
    const id = Number(event.currentTarget.dataset.id)

    const closed = await this._checkMonthClosed()
    if (closed) return

    const acc = this.accounts.find(a => a.id === id)
    if (!acc) return

    this.state = "editing"
    this.editingId = id
    this.selectedIconKey = acc.icon_key || null
    this.selectedColorKey = acc.color_key || "blue"
    this.iconPickerOpen = false

    // Set modal title
    this.modalTitleTarget.textContent = "Edit Account"

    // Populate fields
    this.modalNameTarget.value = acc.name || ""
    this.modalInstitutionTarget.value = acc.institution || ""
    this.modalBalanceTarget.value = parseFloat(acc.balance) || ""

    // Date field: hidden in edit mode
    this.modalDateRowTarget.classList.add("hidden")

    // Rebuild type dropdown, include disabled types if they match current
    this._rebuildTypeDropdown(acc.account_type_master_id)
    this.modalTypeTarget.value = String(acc.account_type_master_id || "")

    // Budget toggle: match current value
    this.modalBudgetTarget.innerHTML = this._renderBudgetToggle(acc.include_in_budget)

    // Update icon preview in modal
    this._updateModalIconPreview()

    // Hide error
    this.modalErrorTarget.classList.add("hidden")

    // Show modal
    this.accountModalTarget.classList.remove("hidden")
    this._registerModalEscape()

    // Focus name
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  cancelModal() {
    this.accountModalTarget.classList.add("hidden")
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
    const account_type_master_id = this.modalTypeTarget.value
    const institution = this.modalInstitutionTarget.value.trim()
    const balance = this.modalBalanceTarget.value.trim() || "0"
    const effective_date = this.modalDateTarget.value || ""
    const budgetToggle = this.modalBudgetTarget.querySelector(".budget-toggle")
    const include_in_budget = budgetToggle?.dataset.checked === "true"

    if (!name) {
      this._showModalError("Name is required")
      this.modalNameTarget.focus()
      return
    }
    if (!account_type_master_id) {
      this._showModalError("Account Type is required")
      this.modalTypeTarget.focus()
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
          name, account_type_master_id, institution, balance, effective_date,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey,
          include_in_budget
        }})
      })

      if (response.ok) {
        const newAcc = await response.json()
        this.accounts.push(newAcc)
        this.cancelModal()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || data.error || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  async saveEdit() {
    const name = this.modalNameTarget.value.trim()
    const account_type_master_id = this.modalTypeTarget.value
    const institution = this.modalInstitutionTarget.value.trim()
    const balance = this.modalBalanceTarget.value.trim() || "0"
    const budgetToggle = this.modalBudgetTarget.querySelector(".budget-toggle")
    const include_in_budget = budgetToggle?.dataset.checked === "true"

    if (!name) {
      this._showModalError("Name is required")
      this.modalNameTarget.focus()
      return
    }
    if (!account_type_master_id) {
      this._showModalError("Account Type is required")
      this.modalTypeTarget.focus()
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
          name, account_type_master_id, institution, balance,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey,
          include_in_budget
        }})
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.accounts.findIndex(a => a.id === this.editingId)
        if (idx !== -1) this.accounts[idx] = updated
        this.cancelModal()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || data.error || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  // --- Delete ---

  async confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const acc = this.accounts.find(a => a.id === id)
    if (!acc) return

    const closed = await this._checkMonthClosed()
    if (closed) return

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
        headers: { "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue }
      })
      if (response.ok || response.status === 204) {
        this.accounts = this.accounts.filter(a => a.id !== this.deletingId)
        this.renderTable()
      } else if (response.status === 409) {
        const data = await response.json().catch(() => ({}))
        this._showBlockedDeleteModal(data.has_deposits, data.has_payments)
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.errors?.[0] || "Failed to delete account")
      }
    } catch (e) {
      alert("Network error while deleting account")
    }

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  _showBlockedDeleteModal(hasDeposits, hasPayments) {
    let bodyText = ""
    if (hasDeposits && hasPayments) {
      bodyText = "This account can\u2019t be deleted because it has Deposits and Payments recorded on it."
    } else if (hasDeposits) {
      bodyText = "This account can\u2019t be deleted because it has Deposits recorded on it."
    } else {
      bodyText = "This account can\u2019t be deleted because it has Payments recorded on it."
    }

    this.blockedDeleteBodyTarget.textContent = bodyText

    let buttonsHtml = ""
    if (hasDeposits) {
      buttonsHtml += `<a href="${this.depositsPageUrlValue}"
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition">Go to Deposits</a>`
    }
    if (hasPayments) {
      buttonsHtml += `<a href="${this.paymentsPageUrlValue}"
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition">Go to Payments</a>`
    }
    buttonsHtml += `<button type="button"
      class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-900 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      data-action="click->accounts#closeBlockedDelete">Close</button>`

    this.blockedDeleteButtonsTarget.innerHTML = buttonsHtml
    this.blockedDeleteModalTarget.classList.remove("hidden")
  }

  closeBlockedDelete() {
    this.blockedDeleteModalTarget.classList.add("hidden")
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
    const picker = this.hasModalIconPickerTarget ? this.modalIconPickerTarget : this.element
    const dropdown = picker.querySelector("[data-icon-picker-dropdown]")
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
    const picker = this.hasModalIconPickerTarget ? this.modalIconPickerTarget : this.element
    const preview = picker.querySelector("[data-icon-preview]")
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

    // Only persist to server if toggling from the table row (has data-id)
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

  // --- Sorting ---

  toggleSort(event) {
    const field = event.currentTarget.dataset.sortField
    if (!field) return
    if (this.sortField === field) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc"
    } else {
      this.sortField = field
      this.sortDir = "asc"
    }
    this._updateSortIcons()
    this.renderTable()
  }

  _getSortedAccounts() {
    if (!this.sortField) return [...this.accounts]

    const sorted = [...this.accounts]
    const dir = this.sortDir === "asc" ? 1 : -1

    sorted.sort((a, b) => {
      let valA, valB
      switch (this.sortField) {
        case "name":
          valA = (a.name || "").toLowerCase()
          valB = (b.name || "").toLowerCase()
          return valA < valB ? -dir : valA > valB ? dir : 0
        case "type":
          valA = (a.account_type_description || a.account_type_name || "").toLowerCase()
          valB = (b.account_type_description || b.account_type_name || "").toLowerCase()
          return valA < valB ? -dir : valA > valB ? dir : 0
        case "institution":
          valA = (a.institution || "").toLowerCase()
          valB = (b.institution || "").toLowerCase()
          return valA < valB ? -dir : valA > valB ? dir : 0
        case "balance":
          valA = parseFloat(a.balance) || 0
          valB = parseFloat(b.balance) || 0
          return (valA - valB) * dir
        case "in_budget":
          valA = a.include_in_budget ? 1 : 0
          valB = b.include_in_budget ? 1 : 0
          return (valA - valB) * dir
        default:
          return 0
      }
    })
    return sorted
  }

  _updateSortIcons() {
    if (!this.hasTableHeadTarget) return
    const icons = this.tableHeadTarget.querySelectorAll("[data-sort-icon]")
    icons.forEach(icon => {
      const field = icon.dataset.sortIcon
      if (field === this.sortField) {
        icon.innerHTML = this.sortDir === "asc"
          ? `<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>`
          : `<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`
        icon.className = "text-brand-600 dark:text-brand-400"
      } else {
        icon.innerHTML = ""
        icon.className = "text-gray-300 dark:text-gray-600"
      }
    })
  }

  // --- Rendering (display-only) ---

  renderTable() {
    let html = ""
    const sorted = this._getSortedAccounts()

    for (const acc of sorted) {
      html += this.renderDisplayRow(acc)
    }

    if (this.accounts.length === 0) {
      html = `<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No accounts yet. Click "Add Account" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
    this._updateTotal()
  }

  _updateTotal() {
    if (!this.hasTotalTarget) return
    const sum = this.accounts
      .reduce((acc, a) => acc + parseFloat(a.balance || 0), 0)
    this.totalTarget.textContent = `— Total: ${sum.toLocaleString("en-US", { style: "currency", currency: "USD" })}`
  }

  goToReconciliation(event) {
    const accountId = event.currentTarget.dataset.id
    if (accountId) {
      window.location.href = `${this.reconciliationUrlValue}?account_id=${accountId}`
    }
  }

  _formatBalance(balance) {
    const num = parseFloat(balance)
    if (!num && num !== 0) return "&mdash;"
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  renderDisplayRow(acc) {
    const budgetToggle = this._renderBudgetToggle(acc.include_in_budget, acc.id)

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4">${iconFor(acc.icon_key, acc.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white cursor-pointer" data-id="${acc.id}" data-action="dblclick->accounts#goToReconciliation">${escapeHtml(acc.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(acc.account_type_description || acc.account_type_name || "")}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(acc.institution || "")}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right font-mono">${this._formatBalance(acc.balance)}</td>
      <td class="px-6 py-4 text-center">${budgetToggle}</td>
      <td class="px-6 py-4 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${acc.id}"
                data-action="click->accounts#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${acc.id}"
                data-action="click->accounts#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  // --- Type Dropdown ---

  _rebuildTypeDropdown(currentMasterId = null) {
    const types = this.accountTypes.filter(at =>
      at.is_enabled !== false || (currentMasterId && at.account_type_master_id === currentMasterId)
    )
    let html = `<option value="">Select type...</option>`
    html += types.map(at =>
      `<option value="${at.account_type_master_id}">${escapeHtml(at.display_name)}</option>`
    ).join("")
    this.modalTypeTarget.innerHTML = html
  }

  handleNewDropdown(event) {
    if (event.target.value !== "new") return
    if (this.typesPageUrlValue) {
      const a = document.createElement("a")
      a.href = this.typesPageUrlValue
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  // --- Month Closed Check ---

  async _checkMonthClosed() {
    if (!this.openMonthUrlValue) return false
    try {
      const res = await fetch(this.openMonthUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return false
      const openMonth = await res.json()
      if (openMonth.is_closed) {
        const monthName = new Date(openMonth.current_year, openMonth.current_month - 1).toLocaleString("en-US", { month: "long" })
        this.monthClosedMessageTarget.innerHTML =
          `The current month <strong class="text-gray-900 dark:text-white">${monthName} ${openMonth.current_year}</strong> is closed. You cannot add, edit, or delete accounts while the month is closed.`
        this.monthClosedModalTarget.classList.remove("hidden")
        return true
      }
      return false
    } catch (e) {
      return false
    }
  }

  closeMonthClosed() {
    this.monthClosedModalTarget.classList.add("hidden")
  }

  // --- Modal Helpers ---

  _showModalError(message) {
    this.modalErrorTarget.classList.remove("hidden")
    this.modalErrorTarget.querySelector("p").textContent = message
  }

  _registerModalEscape() {
    this._modalEscapeHandler = (e) => {
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
    document.addEventListener("keydown", this._modalEscapeHandler)
  }

  _unregisterModalEscape() {
    if (this._modalEscapeHandler) {
      document.removeEventListener("keydown", this._modalEscapeHandler)
      this._modalEscapeHandler = null
    }
  }
}
