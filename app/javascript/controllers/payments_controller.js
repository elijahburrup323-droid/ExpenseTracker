import { Controller } from "@hotwired/stimulus"
import { escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"

const TYPE_BADGE_COLORS = {
  blue:   { bg: "bg-blue-100 dark:bg-blue-900/40",   text: "text-blue-700 dark:text-blue-300" },
  green:  { bg: "bg-green-100 dark:bg-green-900/40",  text: "text-green-700 dark:text-green-300" },
  gold:   { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300" },
  red:    { bg: "bg-red-100 dark:bg-red-900/40",     text: "text-red-700 dark:text-red-300" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300" }
}
const DEFAULT_BADGE = { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-300" }

export default class extends Controller {
  static targets = [
    "tableBody", "tableHead", "addButton", "generateButton", "deleteModal", "deleteModalName",
    "filterStartDate", "filterEndDate", "filterAccount", "filterCategory", "filterType", "filterSearch"
  ]
  static values = {
    apiUrl: String, accountsUrl: String, categoriesUrl: String, typesUrl: String, csrfToken: String,
    accountsPageUrl: String, categoriesPageUrl: String, typesPageUrl: String
  }

  connect() {
    this.payments = []
    this.accounts = []
    this.categories = []
    this.spendingTypes = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this._sortColumn = "payment_date"
    this._sortDirection = "asc"
    this._setDefaultDateRange()
    this.fetchAll()
  }

  // --- Default Date Range ---

  _setDefaultDateRange() {
    const today = new Date()
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(today.getDate() - 14)
    this._defaultStartDate = this._formatDateValue(twoWeeksAgo)
    this._defaultEndDate = this._formatDateValue(today)
  }

  _formatDateValue(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  // --- Generate Data ---

  async generateData() {
    if (this.state !== "idle") return
    if (this.accounts.length === 0 || this.categories.length === 0) {
      alert("Please generate Accounts and Spending Categories first before generating payments.")
      return
    }

    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`
    this.addButtonTarget.disabled = true

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const randAmt = () => (Math.random() * 495 + 5).toFixed(2)
    const daysAgo = (n) => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return this._formatDateValue(d)
    }

    const dummyData = [
      { description: "Whole Foods", daysBack: 1 },
      { description: "Shell Gas Station", daysBack: 3 },
      { description: "Netflix Monthly", daysBack: 5 },
      { description: "Rent Payment", daysBack: 7 },
      { description: "Dr. Smith Copay", daysBack: 9 },
      { description: "Amazon Purchase", daysBack: 12 },
      { description: "Electric Company", daysBack: 15 },
      { description: "Planet Fitness", daysBack: 18 },
      { description: "Target Shopping", daysBack: 22 },
      { description: "Uber Ride", daysBack: 27 }
    ]

    for (const item of dummyData) {
      const account = pick(this.accounts)
      const category = pick(this.categories)
      const amount = randAmt()
      try {
        const response = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ payment: {
            account_id: account.id,
            spending_category_id: category.id,
            payment_date: daysAgo(item.daysBack),
            description: item.description,
            amount
          }})
        })
        if (response.ok) {
          const newPayment = await response.json()
          this.payments.unshift(newPayment)
          this._adjustLocalAccountBalance(account.id, -parseFloat(amount))
        }
      } catch (e) {
        // skip on error
      }
    }

    btn.innerHTML = originalText
    btn.disabled = false
    this.addButtonTarget.disabled = false
    this._populateFilterDropdowns()
    this.renderTable()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const [paymentsRes, accountsRes, categoriesRes, typesRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.categoriesUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.typesUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (paymentsRes.ok) this.payments = await paymentsRes.json()
      if (accountsRes.ok) this.accounts = await accountsRes.json()
      if (categoriesRes.ok) this.categories = await categoriesRes.json()
      if (typesRes.ok) this.spendingTypes = await typesRes.json()
    } catch (e) {
      // silently fail
    }
    this._populateFilterDropdowns()
    this._applyDefaultDates()
    this.renderTable()
  }

  _populateFilterDropdowns() {
    const accSelect = this.filterAccountTarget
    accSelect.innerHTML = `<option value="">All Accounts</option>` +
      this._buildAccountOptions()

    const catSelect = this.filterCategoryTarget
    catSelect.innerHTML = `<option value="">All Categories</option>` +
      this._buildCategoryOptions()

    const typeSelect = this.filterTypeTarget
    typeSelect.innerHTML = `<option value="">All Spending Types</option>` +
      this.spendingTypes.map(t => {
        const desc = t.description ? ` — ${t.description}` : ""
        return `<option value="${t.name}">${escapeHtml(t.name)}${escapeHtml(desc)}</option>`
      }).join("")
  }

  _buildAccountOptions(selectedId = null) {
    return this.accounts.map(a => {
      const bal = parseFloat(a.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const typeName = a.account_type_name ? ` (${a.account_type_name})` : ""
      const sel = selectedId != null && a.id === selectedId ? "selected" : ""
      return `<option value="${a.id}" ${sel}>${escapeHtml(a.name)}${escapeHtml(typeName)} — $${bal}</option>`
    }).join("")
  }

  _buildCategoryOptions(selectedId = null) {
    return this.categories.map(c => {
      const typeName = c.spending_type_name ? ` (${c.spending_type_name})` : ""
      const sel = selectedId != null && c.id === selectedId ? "selected" : ""
      return `<option value="${c.id}" ${sel}>${escapeHtml(c.name)}${escapeHtml(typeName)}</option>`
    }).join("")
  }

  _applyDefaultDates() {
    if (!this.filterStartDateTarget.value) this.filterStartDateTarget.value = this._defaultStartDate
    if (!this.filterEndDateTarget.value) this.filterEndDateTarget.value = this._defaultEndDate
  }

  // --- Filtering ---

  applyFilters() {
    this.renderTable()
  }

  searchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.renderTable()
    }
  }

  resetFilters() {
    this.filterStartDateTarget.value = this._defaultStartDate
    this.filterEndDateTarget.value = this._defaultEndDate
    this.filterAccountTarget.value = ""
    this.filterCategoryTarget.value = ""
    this.filterTypeTarget.value = ""
    // Intentionally do NOT clear the search description box
    this.renderTable()
  }

  _getFilteredPayments() {
    const startDate = this.filterStartDateTarget.value
    const endDate = this.filterEndDateTarget.value
    const accountId = this.filterAccountTarget.value
    const categoryId = this.filterCategoryTarget.value
    const typeName = this.filterTypeTarget.value
    const search = this.filterSearchTarget.value.trim()

    // Check for combination search pattern: =amount (e.g. =56.74)
    const comboMatch = search.match(/^=([0-9]+\.?[0-9]*)$/)
    this._highlightedPaymentIds = null

    let filtered = this.payments.filter(p => {
      if (startDate && p.payment_date < startDate) return false
      if (endDate && p.payment_date > endDate) return false
      if (accountId && p.account_id !== Number(accountId)) return false
      if (categoryId && p.spending_category_id !== Number(categoryId)) return false
      if (typeName && p.spending_type_name !== typeName) return false
      if (search && !comboMatch) {
        const lowerSearch = search.toLowerCase()
        const amountStr = String(parseFloat(p.amount || 0))
        const formattedAmount = parseFloat(p.amount || 0).toFixed(2)
        if (!p.description.toLowerCase().includes(lowerSearch) &&
            !amountStr.includes(search) &&
            !formattedAmount.includes(search)) return false
      }
      return true
    })

    if (comboMatch) {
      const targetAmount = parseFloat(comboMatch[1])
      // Find exact matches first
      const exactMatches = filtered.filter(p => Math.abs(parseFloat(p.amount) - targetAmount) < 0.005)
      if (exactMatches.length > 0) {
        this._highlightedPaymentIds = new Set(exactMatches.map(p => p.id))
      }
      // Find combinations that sum to the target
      const comboIds = this._findCombination(filtered, targetAmount)
      if (comboIds) {
        this._highlightedPaymentIds = this._highlightedPaymentIds || new Set()
        comboIds.forEach(id => this._highlightedPaymentIds.add(id))
      }
    }

    return filtered
  }

  _findCombination(payments, target) {
    // Subset-sum: find a group of payments whose amounts sum to target
    // Limit to first 50 payments for performance
    const candidates = payments.slice(0, 50)
    const epsilon = 0.005

    // Try combinations of increasing size (2 to 6)
    for (let size = 2; size <= Math.min(6, candidates.length); size++) {
      const result = this._combineN(candidates, 0, size, target, [], epsilon)
      if (result) return result.map(p => p.id)
    }
    return null
  }

  _combineN(arr, start, remaining, target, current, epsilon) {
    if (remaining === 0) {
      const sum = current.reduce((s, p) => s + parseFloat(p.amount), 0)
      return Math.abs(sum - target) < epsilon ? current : null
    }
    for (let i = start; i <= arr.length - remaining; i++) {
      const result = this._combineN(arr, i + 1, remaining - 1, target, [...current, arr[i]], epsilon)
      if (result) return result
    }
    return null
  }

  // --- State Transitions ---

  startAdding() {
    if (this.state === "adding") return
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    this.state = "adding"
    this.renderTable()
    const dateInput = this.tableBodyTarget.querySelector("input[name='payment_date']")
    if (dateInput) {
      dateInput.focus()
      try { dateInput.showPicker() } catch (e) { /* browser may not support showPicker */ }
    }
  }

  cancelAdding() {
    this.state = "idle"
    this.renderTable()
  }

  async saveNew() {
    const dateInput = this.tableBodyTarget.querySelector("input[name='payment_date']")
    const accSelect = this.tableBodyTarget.querySelector("select[name='account_id']")
    const catSelect = this.tableBodyTarget.querySelector("select[name='spending_category_id']")
    const typeOverrideSelect = this.tableBodyTarget.querySelector("select[name='spending_type_override_id']")
    const descInput = this.tableBodyTarget.querySelector("input[name='description']")
    const amtInput = this.tableBodyTarget.querySelector("input[name='amount']")
    const notesInput = this.tableBodyTarget.querySelector("input[name='notes']")

    const payment_date = dateInput?.value
    const account_id = accSelect?.value
    const spending_category_id = catSelect?.value
    const spending_type_override_id = typeOverrideSelect?.value || null
    const description = descInput?.value?.trim()
    const amount = amtInput?.value?.trim() || "0"
    const notes = notesInput?.value?.trim()

    if (!payment_date) { this.showRowError("Date is required"); dateInput?.focus(); return }
    if (!account_id || account_id === "new") { this.showRowError("Account is required — select an existing account or refresh after creating one"); accSelect?.focus(); return }
    if (!spending_category_id || spending_category_id === "new") { this.showRowError("Category is required — select an existing category or refresh after creating one"); catSelect?.focus(); return }
    if (!description) { this.showRowError("Description is required"); descInput?.focus(); return }
    if (!amount || parseFloat(amount) === 0) { this.showRowError("Amount is required"); amtInput?.focus(); return }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ payment: { account_id, spending_category_id, spending_type_override_id, payment_date, description, notes, amount } })
      })

      if (response.ok) {
        const newPayment = await response.json()
        this.payments.unshift(newPayment)
        this._adjustLocalAccountBalance(Number(account_id), -parseFloat(amount))
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
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    const id = Number(event.currentTarget.dataset.id)
    this.state = "editing"
    this.editingId = id
    this.renderTable()
    const descInput = this.tableBodyTarget.querySelector("input[name='description']")
    if (descInput) descInput.focus()
  }

  cancelEditing() {
    this.state = "idle"
    this.editingId = null
    this.renderTable()
  }

  async saveEdit() {
    const dateInput = this.tableBodyTarget.querySelector("input[name='payment_date']")
    const accSelect = this.tableBodyTarget.querySelector("select[name='account_id']")
    const catSelect = this.tableBodyTarget.querySelector("select[name='spending_category_id']")
    const typeOverrideSelect = this.tableBodyTarget.querySelector("select[name='spending_type_override_id']")
    const descInput = this.tableBodyTarget.querySelector("input[name='description']")
    const amtInput = this.tableBodyTarget.querySelector("input[name='amount']")
    const notesInput = this.tableBodyTarget.querySelector("input[name='notes']")

    const payment_date = dateInput?.value
    const account_id = accSelect?.value
    const spending_category_id = catSelect?.value
    const spending_type_override_id = typeOverrideSelect?.value || null
    const description = descInput?.value?.trim()
    const amount = amtInput?.value?.trim() || "0"
    const notes = notesInput?.value?.trim()

    if (!payment_date) { this.showRowError("Date is required"); dateInput?.focus(); return }
    if (!account_id || account_id === "new") { this.showRowError("Account is required — select an existing account or refresh after creating one"); accSelect?.focus(); return }
    if (!spending_category_id || spending_category_id === "new") { this.showRowError("Category is required — select an existing category or refresh after creating one"); catSelect?.focus(); return }
    if (!description) { this.showRowError("Description is required"); descInput?.focus(); return }
    if (!amount || parseFloat(amount) === 0) { this.showRowError("Amount is required"); amtInput?.focus(); return }

    const oldPayment = this.payments.find(p => p.id === this.editingId)
    const oldAmount = parseFloat(oldPayment?.amount || 0)
    const oldAccountId = oldPayment?.account_id

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ payment: { account_id, spending_category_id, spending_type_override_id, payment_date, description, notes, amount } })
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.payments.findIndex(p => p.id === this.editingId)
        if (idx !== -1) this.payments[idx] = updated
        // Revert old amount on old account, apply new amount on new account
        this._adjustLocalAccountBalance(oldAccountId, oldAmount)
        this._adjustLocalAccountBalance(Number(account_id), -parseFloat(amount))
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
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null; this.renderTable() }
    const id = Number(event.currentTarget.dataset.id)
    const payment = this.payments.find(p => p.id === id)
    if (!payment) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = payment.description
    this.deleteModalTarget.classList.remove("hidden")
    this.addButtonTarget.disabled = true
  }

  cancelDelete() {
    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  async executeDelete() {
    const payment = this.payments.find(p => p.id === this.deletingId)
    try {
      const response = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (response.ok || response.status === 204) {
        this.payments = this.payments.filter(p => p.id !== this.deletingId)
        if (payment) {
          this._adjustLocalAccountBalance(payment.account_id, parseFloat(payment.amount))
        }
        this.renderTable()
      }
    } catch (e) {}

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Local Account Balance Adjustment ---

  _adjustLocalAccountBalance(accountId, delta) {
    const acc = this.accounts.find(a => a.id === accountId)
    if (acc) {
      acc.balance = (parseFloat(acc.balance) + delta).toFixed(2)
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
      if (this.state === "adding") this.cancelAdding()
      else if (this.state === "editing") this.cancelEditing()
    }
  }

  // --- Column Sorting ---

  sortColumn(event) {
    const col = event.currentTarget.dataset.sortCol
    if (this._sortColumn === col) {
      this._sortDirection = this._sortDirection === "asc" ? "desc" : "asc"
    } else {
      this._sortColumn = col
      this._sortDirection = "asc"
    }
    this.renderTable()
  }

  _sortPayments(payments) {
    const col = this._sortColumn
    const dir = this._sortDirection === "asc" ? 1 : -1

    return [...payments].sort((a, b) => {
      let aVal, bVal
      switch (col) {
        case "payment_date":
          aVal = a.payment_date || ""; bVal = b.payment_date || ""
          return aVal.localeCompare(bVal) * dir
        case "account":
          aVal = (a.account_name || "").toLowerCase(); bVal = (b.account_name || "").toLowerCase()
          return aVal.localeCompare(bVal) * dir
        case "category":
          aVal = (a.spending_category_name || "").toLowerCase(); bVal = (b.spending_category_name || "").toLowerCase()
          return aVal.localeCompare(bVal) * dir
        case "type":
          aVal = (a.spending_type_name || "").toLowerCase(); bVal = (b.spending_type_name || "").toLowerCase()
          return aVal.localeCompare(bVal) * dir
        case "description":
          aVal = (a.description || "").toLowerCase(); bVal = (b.description || "").toLowerCase()
          return aVal.localeCompare(bVal) * dir
        case "amount":
          aVal = parseFloat(a.amount) || 0; bVal = parseFloat(b.amount) || 0
          return (aVal - bVal) * dir
        default:
          return 0
      }
    })
  }

  _sortIndicator(col) {
    if (this._sortColumn !== col) return ""
    return this._sortDirection === "asc"
      ? ` <svg class="inline h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>`
      : ` <svg class="inline h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`
  }

  // --- Rendering ---

  renderTable() {
    const isIdle = this.state === "idle"
    this.addButtonTarget.disabled = !isIdle
    if (this.hasGenerateButtonTarget) this.generateButtonTarget.disabled = !isIdle

    let filtered = this._getFilteredPayments()

    // Sort: default by date ascending, or by user-selected column
    if (this._sortColumn) {
      filtered = this._sortPayments(filtered)
    } else {
      filtered.sort((a, b) => (a.payment_date || "").localeCompare(b.payment_date || ""))
    }

    // Move highlighted (combination search) rows to the top
    if (this._highlightedPaymentIds && this._highlightedPaymentIds.size > 0) {
      const highlighted = filtered.filter(p => this._highlightedPaymentIds.has(p.id))
      const rest = filtered.filter(p => !this._highlightedPaymentIds.has(p.id))
      filtered = [...highlighted, ...rest]
    }

    let html = ""

    if (this.state === "adding") {
      html += this._renderAddRow()
    }

    for (const payment of filtered) {
      if (this.state === "editing" && payment.id === this.editingId) {
        html += this._renderEditRow(payment)
      } else {
        html += this._renderDisplayRow(payment, isIdle)
      }
    }

    if (filtered.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No payments found. Click "Add Payment" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
    this._updateSortHeaders()
  }

  _updateSortHeaders() {
    if (!this.hasTableHeadTarget) return
    this.tableHeadTarget.querySelectorAll("[data-sort-col]").forEach(th => {
      const col = th.dataset.sortCol
      // Remove any existing indicator
      const existingIndicator = th.querySelector(".sort-indicator")
      if (existingIndicator) existingIndicator.remove()
      // Add indicator if this is the active sort column
      if (this._sortColumn === col) {
        const span = document.createElement("span")
        span.className = "sort-indicator"
        span.innerHTML = this._sortDirection === "asc"
          ? `<svg class="inline h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>`
          : `<svg class="inline h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`
        th.appendChild(span)
      }
    })
  }

  _formatBalance(balance) {
    const num = parseFloat(balance)
    if (!num && num !== 0) return "&mdash;"
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  _formatDate(dateStr) {
    if (!dateStr) return ""
    const [y, m, d] = dateStr.split("-")
    return `${parseInt(m)}/${parseInt(d)}/${y}`
  }

  _renderTypeBadge(colorKey, name) {
    const colors = TYPE_BADGE_COLORS[colorKey] || DEFAULT_BADGE
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}">${escapeHtml(name)}</span>`
  }

  _buildTypeOptions(selectedId = null) {
    return this.spendingTypes.map(t => {
      const sel = selectedId != null && t.id === selectedId ? "selected" : ""
      return `<option value="${t.id}" ${sel}>${escapeHtml(t.name)}</option>`
    }).join("")
  }

  _getAutoTypeName(categoryId) {
    const cat = this.categories.find(c => c.id === Number(categoryId))
    if (!cat) return ""
    const type = this.spendingTypes.find(t => t.id === cat.spending_type_id)
    return type ? type.name : cat.spending_type_name || ""
  }

  _getAutoTypeColorKey(categoryId) {
    const cat = this.categories.find(c => c.id === Number(categoryId))
    if (!cat) return "blue"
    const type = this.spendingTypes.find(t => t.id === cat.spending_type_id)
    return type ? type.color_key : "blue"
  }

  _renderDisplayRow(payment, actionsEnabled) {
    const disabledClass = actionsEnabled ? "" : "opacity-50 cursor-not-allowed"
    const disabledAttr = actionsEnabled ? "" : "disabled"
    const highlighted = this._highlightedPaymentIds && this._highlightedPaymentIds.has(payment.id)
    const rowClass = highlighted ? "bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-300 dark:ring-yellow-700" : "hover:bg-gray-50 dark:hover:bg-gray-700"

    return `<tr class="${rowClass} transition-colors">
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">${this._formatDate(payment.payment_date)}</td>
      <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(payment.account_name || "")}</td>
      <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(payment.spending_category_name || "")}</td>
      <td class="px-4 py-3 text-sm">${this._renderTypeBadge(payment.spending_type_color_key, payment.spending_type_name || "")}</td>
      <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(payment.description)}</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-mono">${this._formatBalance(payment.amount)}</td>
      <td class="px-4 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition ${disabledClass}"
                data-id="${payment.id}"
                data-action="click->payments#startEditing"
                ${disabledAttr}
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition ${disabledClass}"
                data-id="${payment.id}"
                data-action="click->payments#confirmDelete"
                ${disabledAttr}
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  _renderAddRow() {
    const today = this._formatDateValue(new Date())
    const accountOptions = this._buildAccountOptions()
    const categoryOptions = this._buildCategoryOptions()

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-4 py-3">
        <input type="date" name="payment_date" value="${today}"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
               data-action="keydown->payments#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <select name="account_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
                data-action="keydown->payments#handleKeydown change->payments#handleNewDropdown">
          <option value="">Select...</option>
          <option value="new">— New Account —</option>
          ${accountOptions}
        </select>
      </td>
      <td class="px-4 py-3">
        <select name="spending_category_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
                data-action="keydown->payments#handleKeydown change->payments#handleNewDropdown change->payments#onCategoryChange">
          <option value="">Select...</option>
          <option value="new">— New Category —</option>
          ${categoryOptions}
        </select>
      </td>
      <td class="px-4 py-3">
        <select name="spending_type_override_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
                data-action="keydown->payments#handleKeydown">
          <option value="">Auto (from category)</option>
          ${this._buildTypeOptions()}
        </select>
      </td>
      <td class="px-4 py-3">
        <input type="text" name="description" value="" placeholder="Description" maxlength="255"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
               data-action="keydown->payments#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
          <input type="number" name="amount" value="" placeholder="0.00" step="0.01"
                 class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5 text-right"
                 data-action="keydown->payments#handleKeydown">
        </div>
      </td>
      <td class="px-4 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->payments#saveNew"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->payments#cancelAdding"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden">
      <td colspan="7" class="px-4 py-3">
        <input type="text" name="notes" value="" placeholder="Notes (optional)" maxlength="500"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
               data-action="keydown->payments#handleKeydown">
      </td>
    </tr>
    <tr class="hidden" data-payments-target="rowError">
      <td colspan="7" class="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  _renderEditRow(payment) {
    const accountOptions = this._buildAccountOptions(payment.account_id)
    const categoryOptions = this._buildCategoryOptions(payment.spending_category_id)
    const amtVal = parseFloat(payment.amount) || ""
    const autoTypeName = payment.spending_type_name ? `Auto: ${payment.spending_type_name}` : "Auto (from category)"

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-4 py-3">
        <input type="date" name="payment_date" value="${escapeAttr(payment.payment_date || "")}"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
               data-action="keydown->payments#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <select name="account_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
                data-action="keydown->payments#handleKeydown change->payments#handleNewDropdown">
          <option value="">Select...</option>
          <option value="new">— New Account —</option>
          ${accountOptions}
        </select>
      </td>
      <td class="px-4 py-3">
        <select name="spending_category_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
                data-action="keydown->payments#handleKeydown change->payments#handleNewDropdown change->payments#onCategoryChange">
          <option value="">Select...</option>
          <option value="new">— New Category —</option>
          ${categoryOptions}
        </select>
      </td>
      <td class="px-4 py-3">
        <select name="spending_type_override_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
                data-action="keydown->payments#handleKeydown">
          <option value="">${escapeHtml(autoTypeName)}</option>
          ${this._buildTypeOptions(payment.spending_type_override_id)}
        </select>
      </td>
      <td class="px-4 py-3">
        <input type="text" name="description" value="${escapeAttr(payment.description)}" placeholder="Description" maxlength="255"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5"
               data-action="keydown->payments#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
          <input type="number" name="amount" value="${amtVal}" placeholder="0.00" step="0.01"
                 class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-2 py-1.5 text-right"
                 data-action="keydown->payments#handleKeydown">
        </div>
      </td>
      <td class="px-4 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->payments#saveEdit"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->payments#cancelEditing"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-payments-target="rowError">
      <td colspan="7" class="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  // --- "New" Dropdown Handler ---

  handleNewDropdown(event) {
    if (event.target.value !== "new") return
    const name = event.target.name
    let url = null
    if (name === "account_id") url = this.accountsPageUrlValue
    else if (name === "spending_category_id") url = this.categoriesPageUrlValue
    if (url) this._openInNewTab(url)
    // Leave "new" selected so user knows they need to refresh/reselect
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

  // --- Category Change (Auto-type) ---

  onCategoryChange(event) {
    const categoryId = event.target.value
    const autoTypeEl = this.element.querySelector("[data-payments-target='autoType']")
    if (autoTypeEl) {
      if (categoryId) {
        const typeName = this._getAutoTypeName(categoryId)
        const colorKey = this._getAutoTypeColorKey(categoryId)
        autoTypeEl.innerHTML = typeName ? this._renderTypeBadge(colorKey, typeName) : `<span class="text-xs text-gray-400 dark:text-gray-500 italic">Auto</span>`
      } else {
        autoTypeEl.innerHTML = `<span class="text-xs text-gray-400 dark:text-gray-500 italic">Auto</span>`
      }
    }
  }

  // --- Error Display ---

  showRowError(message) {
    const errorRow = this.tableBodyTarget.querySelector("[data-payments-target='rowError']")
    if (errorRow) {
      errorRow.classList.remove("hidden")
      errorRow.querySelector("td").textContent = message
    }
  }
}
