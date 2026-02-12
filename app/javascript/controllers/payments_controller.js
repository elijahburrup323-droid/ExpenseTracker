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
    "filterStartDate", "filterEndDate", "filterAccount", "filterCategory", "filterType", "filterSearch",
    "filterCount", "total",
    "addModal", "addModalBody", "modalDate", "modalAccount", "modalCategory", "modalType",
    "modalDescription", "modalAmount", "modalError"
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

    // Warn user before leaving with unsaved changes
    this._beforeUnloadHandler = (e) => {
      if (this.state === "adding" || this.state === "editing") {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    this._turboBeforeVisitHandler = (e) => {
      if (this.state === "adding" || this.state === "editing") {
        if (!confirm("You have unsaved changes. Discard and leave?")) {
          e.preventDefault()
        } else {
          this.state = "idle"
          this.editingId = null
        }
      }
    }
    window.addEventListener("beforeunload", this._beforeUnloadHandler)
    document.addEventListener("turbo:before-visit", this._turboBeforeVisitHandler)
  }

  disconnect() {
    window.removeEventListener("beforeunload", this._beforeUnloadHandler)
    document.removeEventListener("turbo:before-visit", this._turboBeforeVisitHandler)
  }

  // --- Default Date Range ---

  _setDefaultDateRange() {
    // Check URL params for pre-set date filters (e.g. from Dashboard "View Details" link)
    const params = new URLSearchParams(window.location.search)
    const urlStart = params.get("start_date")
    const urlEnd = params.get("end_date")
    if (urlStart || urlEnd) {
      this._defaultStartDate = urlStart || ""
      this._defaultEndDate = urlEnd || ""
    } else {
      // No default dates — show ALL payments on page load so nothing "disappears"
      this._defaultStartDate = ""
      this._defaultEndDate = ""
    }
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
      const sel = selectedId != null && a.id === selectedId ? "selected" : ""
      return `<option value="${a.id}" ${sel}>${escapeHtml(a.name)}</option>`
    }).join("")
  }

  _buildCategoryOptions(selectedId = null) {
    return this.categories.map(c => {
      const sel = selectedId != null && c.id === selectedId ? "selected" : ""
      return `<option value="${c.id}" ${sel}>${escapeHtml(c.name)}</option>`
    }).join("")
  }

  _applyDefaultDates() {
    // Apply URL-based date filters if present (e.g. from Dashboard "View Details")
    if (this._defaultStartDate) this.filterStartDateTarget.value = this._defaultStartDate
    if (this._defaultEndDate) this.filterEndDateTarget.value = this._defaultEndDate
  }

  // --- Filtering ---

  applyFilters() {
    if (!this._checkDirtyState()) return
    this.renderTable()
  }

  _checkDirtyState() {
    if (this.state !== "adding" && this.state !== "editing") return true
    // Check if any fields have been filled in
    const hasData = this._hasUnsavedData()
    if (!hasData) {
      if (this.state === "adding") this.addModalTarget.classList.add("hidden")
      this.state = "idle"
      this.editingId = null
      return true
    }
    if (!confirm("You have unsaved changes. Discard and continue?")) return false
    if (this.state === "adding") this.addModalTarget.classList.add("hidden")
    this.state = "idle"
    this.editingId = null
    return true
  }

  _hasUnsavedData() {
    if (this.state === "adding") {
      return (this.modalDescriptionTarget.value.trim()) || (this.modalAmountTarget.value.trim())
    }
    const desc = this.tableBodyTarget.querySelector("input[name='description']")
    const amt = this.tableBodyTarget.querySelector("input[name='amount']")
    return (desc && desc.value.trim()) || (amt && amt.value.trim())
  }

  searchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      if (!this._checkDirtyState()) return
      this.renderTable()
    }
  }

  clearSearch() {
    if (!this._checkDirtyState()) return
    this.filterSearchTarget.value = ""
    this.filterSearchTarget.focus()
    this.renderTable()
  }

  resetFilters() {
    if (!this._checkDirtyState()) return
    // Reset clears ALL filters including dates — shows all payments
    this.filterStartDateTarget.value = ""
    this.filterEndDateTarget.value = ""
    this.filterAccountTarget.value = ""
    this.filterCategoryTarget.value = ""
    this.filterTypeTarget.value = ""
    this.filterSearchTarget.value = ""
    this.renderTable()
  }

  _getFilteredPayments() {
    const startDate = this.filterStartDateTarget.value
    const endDate = this.filterEndDateTarget.value
    const accountId = this.filterAccountTarget.value
    const categoryId = this.filterCategoryTarget.value
    const typeName = this.filterTypeTarget.value
    const search = this.filterSearchTarget.value.trim()

    // Check for combination search pattern: =amount or (amount) (e.g. =56.74 or (56.74))
    const comboMatch = search.match(/^[=(]([0-9]+\.?[0-9]*)\)?$/)
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
      const targetCents = Math.round(parseFloat(comboMatch[1]) * 100)
      // Find exact matches first (using integer cents for precision)
      const exactMatches = filtered.filter(p => Math.round(parseFloat(p.amount) * 100) === targetCents)
      if (exactMatches.length > 0) {
        this._highlightedPaymentIds = new Set(exactMatches.map(p => p.id))
      }
      // Find combinations that sum to the target
      const comboIds = this._findCombinationCents(filtered, targetCents)
      if (comboIds) {
        this._highlightedPaymentIds = this._highlightedPaymentIds || new Set()
        comboIds.forEach(id => this._highlightedPaymentIds.add(id))
      }
    }

    return filtered
  }

  _findCombinationCents(payments, targetCents) {
    // Subset-sum using integer cents for precision
    const candidates = payments.slice(0, 50).map(p => ({
      id: p.id,
      cents: Math.round(parseFloat(p.amount) * 100)
    }))

    for (let size = 2; size <= Math.min(6, candidates.length); size++) {
      const result = this._combineNCents(candidates, 0, size, targetCents, [])
      if (result) return result.map(c => c.id)
    }
    return null
  }

  _combineNCents(arr, start, remaining, targetCents, current) {
    if (remaining === 0) {
      const sum = current.reduce((s, c) => s + c.cents, 0)
      return sum === targetCents ? current : null
    }
    for (let i = start; i <= arr.length - remaining; i++) {
      const result = this._combineNCents(arr, i + 1, remaining - 1, targetCents, [...current, arr[i]])
      if (result) return result
    }
    return null
  }

  // --- State Transitions ---

  startAdding() {
    if (this.state === "adding") return
    if (!this._checkDirtyState()) return
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null; this.renderTable() }
    this.state = "adding"
    this._openAddModal()
  }

  cancelAdding() {
    this.state = "idle"
    this.addModalTarget.classList.add("hidden")
    if (this._modalEscapeHandler) {
      document.removeEventListener("keydown", this._modalEscapeHandler)
      this._modalEscapeHandler = null
    }
  }

  async saveNew() {
    const payment_date = this.modalDateTarget.value
    const account_id = this.modalAccountTarget.value
    const spending_category_id = this.modalCategoryTarget.value
    const spending_type_override_id = (this.modalTypeTarget.value && this.modalTypeTarget.value !== "new") ? this.modalTypeTarget.value : null
    const description = this.modalDescriptionTarget.value.trim()
    const amount = this.modalAmountTarget.value.trim() || "0"

    if (!payment_date) { this._showModalError("Date is required"); this.modalDateTarget.focus(); return }
    if (!account_id || account_id === "new") { this._showModalError("Account is required"); this.modalAccountTarget.focus(); return }
    if (!spending_category_id || spending_category_id === "new") { this._showModalError("Category is required"); this.modalCategoryTarget.focus(); return }
    if (!description) { this._showModalError("Description is required"); this.modalDescriptionTarget.focus(); return }
    if (!amount || parseFloat(amount) === 0) { this._showModalError("Amount is required"); this.modalAmountTarget.focus(); return }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ payment: { account_id, spending_category_id, spending_type_override_id, payment_date, description, amount } })
      })

      if (response.ok) {
        const newPayment = await response.json()
        this.payments.unshift(newPayment)
        this._adjustLocalAccountBalance(Number(account_id), -parseFloat(amount))
        this.state = "idle"
        this.addModalTarget.classList.add("hidden")
        if (this._modalEscapeHandler) {
          document.removeEventListener("keydown", this._modalEscapeHandler)
          this._modalEscapeHandler = null
        }
        this.renderTable()
        window.scrollTo({ top: 0, behavior: "smooth" })
        this._refreshAccountBalances()
        // Check if saved date falls outside the current filter range
        const endFilter = this.filterEndDateTarget.value
        const startFilter = this.filterStartDateTarget.value
        if ((endFilter && payment_date > endFilter) || (startFilter && payment_date < startFilter)) {
          alert(`Payment saved successfully! It doesn't appear in the table because the date (${this._formatDate(payment_date)}) is outside your current filter range (${this._formatDate(startFilter)} – ${this._formatDate(endFilter)}). Adjust your date filters to see it.`)
        }
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
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
    const spending_type_override_id = (typeOverrideSelect?.value && typeOverrideSelect.value !== "new") ? typeOverrideSelect.value : null
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
        this._refreshAccountBalances()
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
        this._adjustLocalAccountBalance(payment.account_id, parseFloat(payment.amount))
        this.renderTable()
        // Re-fetch accounts to sync balances with the server
        this._refreshAccountBalances()
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

  async _refreshAccountBalances() {
    try {
      const res = await fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) {
        this.accounts = await res.json()
        this._populateFilterDropdowns()
      }
    } catch (e) {}
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

    for (const payment of filtered) {
      if (this.state === "editing" && payment.id === this.editingId) {
        html += this._renderEditRow(payment)
      } else {
        html += this._renderDisplayRow(payment)
      }
    }

    if (filtered.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No payments found. Click "Add Payment" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
    this._updateSortHeaders()
    this._updateFilterCount(filtered.length)
    this._updateTotal(filtered)
  }

  _updateTotal(filtered) {
    if (!this.hasTotalTarget) return
    const sum = filtered.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0)
    this.totalTarget.textContent = `— Total: ${sum.toLocaleString("en-US", { style: "currency", currency: "USD" })}`
  }

  _updateFilterCount(visibleCount) {
    if (!this.hasFilterCountTarget) return
    const total = this.payments.length
    if (total === 0) {
      this.filterCountTarget.textContent = ""
    } else if (visibleCount === total) {
      this.filterCountTarget.textContent = `Showing all ${total} payments`
    } else {
      this.filterCountTarget.textContent = `Showing ${visibleCount} of ${total} payments (adjust filters to see more)`
    }
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

  _renderDisplayRow(payment) {
    const highlighted = this._highlightedPaymentIds && this._highlightedPaymentIds.has(payment.id)
    const rowClass = highlighted ? "bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-300 dark:ring-yellow-700" : "hover:bg-gray-50 dark:hover:bg-gray-700"

    return `<tr class="${rowClass} transition-colors">
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">${this._formatDate(payment.payment_date)}</td>
      <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(payment.account_name || "")}</td>
      <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(payment.spending_category_name || "")}</td>
      <td class="px-4 py-3 text-sm">${this._renderTypeBadge(payment.spending_type_color_key, payment.spending_type_name || "")}</td>
      <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(payment.description)}</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-mono">${this._formatBalance(payment.amount)}</td>
      <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${payment.id}"
                data-action="click->payments#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${payment.id}"
                data-action="click->payments#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
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
                data-action="keydown->payments#handleKeydown change->payments#handleNewDropdown">
          <option value="">${escapeHtml(autoTypeName)}</option>
          <option value="new">— New Spending Type —</option>
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
      <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
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
    let label = ""
    if (name === "account_id") { url = this.accountsPageUrlValue; label = "Account" }
    else if (name === "spending_category_id") { url = this.categoriesPageUrlValue; label = "Category" }
    else if (name === "spending_type_override_id") { url = this.typesPageUrlValue; label = "Spending Type" }
    if (url) {
      this._openInNewTab(url)
      alert(`A new tab has been opened to create a ${label}. After creating it, come back here and your payment will still be in progress. The dropdown will refresh automatically.`)
      // Auto-refresh dropdowns when user returns to this tab
      this._pendingRefresh = true
      const onFocus = async () => {
        if (!this._pendingRefresh) return
        this._pendingRefresh = false
        window.removeEventListener("focus", onFocus)
        await this._refreshDropdownData()
        // Reset "new" selection to "Select..."
        event.target.value = ""
      }
      window.addEventListener("focus", onFocus)
    }
  }

  async _refreshDropdownData() {
    try {
      const [accountsRes, categoriesRes, typesRes] = await Promise.all([
        fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.categoriesUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.typesUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (accountsRes.ok) this.accounts = await accountsRes.json()
      if (categoriesRes.ok) this.categories = await categoriesRes.json()
      if (typesRes.ok) this.spendingTypes = await typesRes.json()
    } catch (e) {}
    // Rebuild the dropdowns in the add/edit row
    this._rebuildInlineDropdowns()
    this._populateFilterDropdowns()
  }

  _rebuildInlineDropdowns() {
    // Rebuild modal dropdowns if adding, or inline edit dropdowns
    if (this.state === "adding") {
      const currentAcc = this.modalAccountTarget.value
      const currentCat = this.modalCategoryTarget.value
      const currentType = this.modalTypeTarget.value
      this.modalAccountTarget.innerHTML = `<option value="">Select account...</option><option value="new">— New Account —</option>` + this._buildAccountOptions()
      this.modalCategoryTarget.innerHTML = `<option value="">Select category...</option><option value="new">— New Category —</option>` + this._buildCategoryOptions()
      this.modalTypeTarget.innerHTML = `<option value="">Auto (from category)</option><option value="new">— New Spending Type —</option>` + this._buildTypeOptions()
      if (currentAcc && currentAcc !== "new") this.modalAccountTarget.value = currentAcc
      if (currentCat && currentCat !== "new") this.modalCategoryTarget.value = currentCat
      if (currentType && currentType !== "new") this.modalTypeTarget.value = currentType
      return
    }

    const accSelect = this.tableBodyTarget.querySelector("select[name='account_id']")
    const catSelect = this.tableBodyTarget.querySelector("select[name='spending_category_id']")
    const typeSelect = this.tableBodyTarget.querySelector("select[name='spending_type_override_id']")
    if (accSelect) {
      const currentVal = accSelect.value
      const newOption = `<option value="">Select...</option><option value="new">— New Account —</option>` + this._buildAccountOptions()
      accSelect.innerHTML = newOption
      if (currentVal && currentVal !== "new") accSelect.value = currentVal
    }
    if (catSelect) {
      const currentVal = catSelect.value
      const newOption = `<option value="">Select...</option><option value="new">— New Category —</option>` + this._buildCategoryOptions()
      catSelect.innerHTML = newOption
      if (currentVal && currentVal !== "new") catSelect.value = currentVal
    }
    if (typeSelect) {
      const currentVal = typeSelect.value
      const newOption = `<option value="">Auto (from category)</option><option value="new">— New Spending Type —</option>` + this._buildTypeOptions()
      typeSelect.innerHTML = newOption
      if (currentVal && currentVal !== "new") typeSelect.value = currentVal
    }
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

  // --- Add Modal Helpers ---

  _openAddModal() {
    // Populate dropdowns
    this.modalAccountTarget.innerHTML = `<option value="">Select account...</option><option value="new">— New Account —</option>` + this._buildAccountOptions()
    this.modalCategoryTarget.innerHTML = `<option value="">Select category...</option><option value="new">— New Category —</option>` + this._buildCategoryOptions()
    this.modalTypeTarget.innerHTML = `<option value="">Auto (from category)</option><option value="new">— New Spending Type —</option>` + this._buildTypeOptions()

    // Reset fields
    this.modalDateTarget.value = this._formatDateValue(new Date())
    this.modalAccountTarget.value = ""
    this.modalCategoryTarget.value = ""
    this.modalTypeTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this.modalAmountTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalErrorTarget.textContent = ""

    // Show modal
    this.addModalTarget.classList.remove("hidden")

    // Global Escape handler for the modal
    this._modalEscapeHandler = (e) => {
      if (e.key === "Escape") { e.preventDefault(); this.cancelAdding() }
    }
    document.addEventListener("keydown", this._modalEscapeHandler)

    // Focus date field
    setTimeout(() => {
      this.modalDateTarget.focus()
      try { this.modalDateTarget.showPicker() } catch (e) {}
    }, 50)
  }

  _showModalError(message) {
    this.modalErrorTarget.textContent = message
    this.modalErrorTarget.classList.remove("hidden")
  }

  handleModalKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.saveNew()
    } else if (event.key === "Escape") {
      event.preventDefault()
      this.cancelAdding()
    }
  }

  onModalDateChange() {
    if (this.state !== "adding") return
    setTimeout(() => this.modalAccountTarget.focus(), 50)
  }

  onModalAccountChange(event) {
    if (this.state !== "adding") return
    const val = event.target.value
    if (val && val !== "" && val !== "new") {
      setTimeout(() => this.modalCategoryTarget.focus(), 50)
    }
  }

  onModalCategoryChange(event) {
    const categoryId = event.target.value
    if (categoryId && categoryId !== "new") {
      // Auto-select the matching spending type
      const cat = this.categories.find(c => c.id === Number(categoryId))
      if (cat && cat.spending_type_id) {
        this.modalTypeTarget.value = String(cat.spending_type_id)
      }
      setTimeout(() => this.modalDescriptionTarget.focus(), 50)
    }
  }

  // --- Category Change (Edit row auto-type) ---

  onCategoryChange(event) {
    const categoryId = event.target.value
    if (categoryId && categoryId !== "new") {
      const cat = this.categories.find(c => c.id === Number(categoryId))
      if (cat && cat.spending_type_id) {
        const typeSelect = this.tableBodyTarget.querySelector("select[name='spending_type_override_id']")
        if (typeSelect) typeSelect.value = String(cat.spending_type_id)
      }
      setTimeout(() => {
        const descInput = this.tableBodyTarget.querySelector("input[name='description']")
        if (descInput) descInput.focus()
      }, 50)
    }
  }

  // --- Print View ---

  printView() {
    let filtered = this._getFilteredPayments()
    filtered = this._sortColumn ? this._sortPayments(filtered) : filtered.sort((a, b) => (a.payment_date || "").localeCompare(b.payment_date || ""))

    if (filtered.length === 0) {
      alert("No payments to print. Adjust your filters and try again.")
      return
    }

    const total = filtered.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const totalFormatted = total.toLocaleString("en-US", { style: "currency", currency: "USD" })

    // Build active filter summary
    const filterParts = []
    const startDate = this.filterStartDateTarget.value
    const endDate = this.filterEndDateTarget.value
    const accountId = this.filterAccountTarget.value
    const categoryId = this.filterCategoryTarget.value
    const typeName = this.filterTypeTarget.value
    const search = this.filterSearchTarget.value.trim()

    if (startDate || endDate) {
      const s = startDate ? this._formatDate(startDate) : "Beginning"
      const e = endDate ? this._formatDate(endDate) : "Present"
      filterParts.push(`Date: ${s} – ${e}`)
    }
    if (accountId) {
      const acc = this.accounts.find(a => a.id === Number(accountId))
      if (acc) filterParts.push(`Account: ${acc.name}`)
    }
    if (categoryId) {
      const cat = this.categories.find(c => c.id === Number(categoryId))
      if (cat) filterParts.push(`Category: ${cat.name}`)
    }
    if (typeName) filterParts.push(`Type: ${typeName}`)
    if (search) filterParts.push(`Search: "${search}"`)

    const sortLabel = {
      payment_date: "Date", account: "Account", category: "Category",
      type: "Spending Type", description: "Description", amount: "Amount"
    }[this._sortColumn] || "Date"
    const sortDir = this._sortDirection === "asc" ? "Ascending" : "Descending"

    const filterSummary = filterParts.length > 0
      ? filterParts.join(" | ")
      : "All Payments (no filters applied)"

    // Build table rows
    let tableRows = ""
    for (const p of filtered) {
      tableRows += `<tr>
        <td>${this._escapeHtmlPrint(this._formatDate(p.payment_date))}</td>
        <td>${this._escapeHtmlPrint(p.account_name || "")}</td>
        <td>${this._escapeHtmlPrint(p.spending_category_name || "")}</td>
        <td>${this._escapeHtmlPrint(p.spending_type_name || "")}</td>
        <td>${this._escapeHtmlPrint(p.description || "")}</td>
        <td style="text-align:right;font-family:monospace;">$${parseFloat(p.amount || 0).toFixed(2)}</td>
      </tr>`
    }

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BudgetHQ – Payments Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 32px; font-size: 11px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 36px; height: 36px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; }
    .brand { font-size: 22px; font-weight: 700; color: #2563eb; }
    .brand span { color: #6b7280; font-weight: 400; font-size: 14px; margin-left: 6px; }
    .date-printed { font-size: 11px; color: #6b7280; text-align: right; }
    .meta { margin-bottom: 16px; }
    .meta p { font-size: 11px; color: #4b5563; margin-bottom: 2px; }
    .meta strong { color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #d1d5db; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    tr:nth-child(even) { background: #f9fafb; }
    .total-row { border-top: 2px solid #111; font-weight: 700; font-size: 12px; }
    .total-row td { padding-top: 8px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 0; }
      @page { margin: 0.5in; size: landscape; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">B</div>
      <div>
        <div class="brand">BudgetHQ <span>Payments Report</span></div>
      </div>
    </div>
    <div class="date-printed">Printed ${this._escapeHtmlPrint(today)}</div>
  </div>

  <div class="meta">
    <p><strong>Filters:</strong> ${this._escapeHtmlPrint(filterSummary)}</p>
    <p><strong>Sorted by:</strong> ${this._escapeHtmlPrint(sortLabel)} (${this._escapeHtmlPrint(sortDir)})</p>
    <p><strong>Records:</strong> ${filtered.length} payments &nbsp;|&nbsp; <strong>Total:</strong> ${this._escapeHtmlPrint(totalFormatted)}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Account</th>
        <th>Category</th>
        <th>Spending Type</th>
        <th>Description</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="5" style="text-align:right;">Total</td>
        <td style="text-align:right;font-family:monospace;">${this._escapeHtmlPrint(totalFormatted)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">BudgetHQ &mdash; Generated on ${this._escapeHtmlPrint(today)}</div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  _escapeHtmlPrint(str) {
    const div = document.createElement("div")
    div.textContent = str || ""
    return div.innerHTML
  }

  // --- CSV Export ---

  exportCSV() {
    let filtered = this._getFilteredPayments()
    filtered = this._sortColumn ? this._sortPayments(filtered) : filtered.sort((a, b) => (a.payment_date || "").localeCompare(b.payment_date || ""))

    if (filtered.length === 0) {
      alert("No payments to export. Adjust your filters and try again.")
      return
    }

    const headers = ["Date", "Account", "Category", "Spending Type", "Description", "Amount"]
    const csvRows = [headers.join(",")]

    for (const p of filtered) {
      const row = [
        p.payment_date || "",
        this._csvEscape(p.account_name || ""),
        this._csvEscape(p.spending_category_name || ""),
        this._csvEscape(p.spending_type_name || ""),
        this._csvEscape(p.description || ""),
        parseFloat(p.amount || 0).toFixed(2)
      ]
      csvRows.push(row.join(","))
    }

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const today = this._formatDateValue(new Date())
    const a = document.createElement("a")
    a.href = url
    a.download = `payments_${today}.csv`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  _csvEscape(value) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
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
