import { Controller } from "@hotwired/stimulus"
import { iconFor, escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "tableHead", "paginationInfo", "addButton",
    "modal", "modalTitle", "modalFrom", "modalTo", "modalDate", "modalAmount", "modalMemo", "modalError", "modalSaveButton",
    "modalFromBucketRow", "modalFromBucket", "modalToBucketRow", "modalToBucket", "bucketHelperText",
    "deleteModal",
    "dateWarningModal", "dateWarningMessage", "deleteBlockedModal", "deleteBlockedMessage"
  ]

  static values = {
    apiUrl: String,
    accountsUrl: String,
    csrfToken: String,
    openMonthUrl: String,
    bucketsUrl: String
  }

  transfers = []
  accounts = []
  editingId = null
  deletingId = null
  page = 1
  perPage = 10

  _skipDateValidation = false
  _pendingSave = null

  fromBuckets = []
  toBuckets = []
  sortField = null
  sortDir = "asc"

  connect() {
    this._initSoftCloseFix()
    this.fetchAll()
  }

  _initSoftCloseFix() {
    const params = new URLSearchParams(window.location.search)
    this._scFixKey = params.get("sc_fix")
    this._scFixIds = new Set((params.get("ids") || "").split(",").filter(Boolean).map(Number))
    if (this._scFixKey) this._injectSoftCloseBanner()
  }

  _injectSoftCloseBanner() {
    const messages = {
      transfers_valid: "A transfer must have both a From and To account, and the amounts must match. Fix the highlighted transfers so your balances stay correct."
    }
    const msg = messages[this._scFixKey] || "Please review and fix the highlighted items."
    const banner = document.createElement("div")
    banner.id = "sc-fix-banner"
    banner.className = "mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 p-4 ring-1 ring-amber-300 dark:ring-amber-700"
    banner.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-3">
          <svg class="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          <div>
            <p class="text-sm font-medium text-amber-800 dark:text-amber-200">Soft Close Fix</p>
            <p class="mt-1 text-sm text-amber-700 dark:text-amber-300">${msg}</p>
            <a href="/soft_close" class="mt-2 inline-flex items-center text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline">
              <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back to Soft Close Month
            </a>
          </div>
        </div>
        <button onclick="this.closest('#sc-fix-banner').remove()" class="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 ml-4 flex-shrink-0">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>`
    const controller = this.element
    controller.insertBefore(banner, controller.firstChild)
  }

  async fetchAll() {
    try {
      const [transfersRes, accountsRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } })
      ])
      this.transfers = await transfersRes.json()
      this.accounts = await accountsRes.json()
      this.renderTable()
      this._autoOpenSoftCloseFix()
    } catch (e) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-red-500">Failed to load transfers</td></tr>`
    }
  }

  _autoOpenSoftCloseFix() {
    if (!this._scFixKey || this._scFixIds.size === 0 || this._scFixOpened) return
    this._scFixOpened = true
    const firstId = [...this._scFixIds][0]
    const transfer = this.transfers.find(t => t.id === firstId)
    if (transfer) {
      // Ensure the first fix item is on the current page
      const sorted = this._getSortedTransfers()
      const idx = sorted.findIndex(t => t.id === firstId)
      if (idx >= 0) this.page = Math.floor(idx / this.perPage) + 1
      this.renderTable()
      setTimeout(() => this.openEditModal({ currentTarget: { dataset: { id: String(firstId) } } }), 300)
    }
  }

  renderTable() {
    if (this.transfers.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No transfers yet. Click "+ Transfer" to add one.</td></tr>`
      this.paginationInfoTarget.textContent = ""
      return
    }

    const sorted = this._getSortedTransfers()
    const start = (this.page - 1) * this.perPage
    const end = Math.min(start + this.perPage, sorted.length)
    const pageItems = sorted.slice(start, end)

    this.tableBodyTarget.innerHTML = pageItems.map(t => this.renderRow(t)).join("")
    this.paginationInfoTarget.textContent = `${start + 1}–${end} of ${sorted.length}`
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
    this.page = 1
    this._updateSortIcons()
    this.renderTable()
  }

  _getSortedTransfers() {
    if (!this.sortField) return [...this.transfers]

    const sorted = [...this.transfers]
    const dir = this.sortDir === "asc" ? 1 : -1

    sorted.sort((a, b) => {
      let valA, valB
      switch (this.sortField) {
        case "date":
          valA = a.transfer_date || ""
          valB = b.transfer_date || ""
          return valA < valB ? -dir : valA > valB ? dir : 0
        case "from":
          valA = (a.from_account_name || "").toLowerCase()
          valB = (b.from_account_name || "").toLowerCase()
          return valA < valB ? -dir : valA > valB ? dir : 0
        case "to":
          valA = (a.to_account_name || "").toLowerCase()
          valB = (b.to_account_name || "").toLowerCase()
          return valA < valB ? -dir : valA > valB ? dir : 0
        case "memo":
          valA = (a.memo || "").toLowerCase()
          valB = (b.memo || "").toLowerCase()
          return valA < valB ? -dir : valA > valB ? dir : 0
        case "amount":
          valA = parseFloat(a.amount) || 0
          valB = parseFloat(b.amount) || 0
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

  renderRow(t) {
    const date = this.formatDate(t.transfer_date)
    const fromIcon = iconFor(t.from_account_icon_key, t.from_account_color_key)
    const toIcon = iconFor(t.to_account_icon_key, t.to_account_color_key)
    const memo = t.memo ? escapeHtml(t.memo) : ""
    const amount = this.formatCurrency(t.amount)

    const bucketBadge = `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Bucket</span>`
    const fromBucketLabel = t.from_bucket_name ? `<span class="block text-xs text-gray-400">${escapeHtml(t.from_bucket_name)}</span>` : ""
    const toBucketLabel = t.to_bucket_name ? `<span class="block text-xs text-gray-400">${escapeHtml(t.to_bucket_name)}</span>` : ""
    const fromBucketBadge = t.from_bucket_id ? bucketBadge : ""
    const toBucketBadge = t.to_bucket_id ? bucketBadge : ""

    const isFixTarget = this._scFixIds && this._scFixIds.has(t.id)
    const rowClass = isFixTarget
      ? "bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-300 dark:ring-yellow-700"
      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
    const needsFixBadge = isFixTarget
      ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 mr-2">Needs Fix</span>`
      : ""

    return `
      <tr class="${rowClass} transition-colors">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${date}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <div class="flex items-center space-x-2">
            ${fromIcon}
            <div><span>${escapeHtml(t.from_account_name)}</span>${fromBucketLabel}</div>
            ${fromBucketBadge}
            <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <div class="flex items-center space-x-2">
            ${toIcon}
            <div><span>${escapeHtml(t.to_account_name)}</span>${toBucketLabel}</div>
            ${toBucketBadge}
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">${memo}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums font-medium text-green-600">${amount}</td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <div class="flex items-center justify-center space-x-2">
            ${needsFixBadge}
            <button class="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 transition"
                    title="Edit" data-action="click->transfer-masters#openEditModal" data-id="${t.id}">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
            <button class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
                    title="Delete" data-action="click->transfer-masters#confirmDelete" data-id="${t.id}">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>`
  }

  // ── Modal Helpers ──

  populateAccountDropdowns(fromId = "", toId = "") {
    const activeAccounts = this.accounts.filter(a => !a.deleted_at)
    const optionsHtml = activeAccounts.map(a => {
      const displayBal = a.display_balance != null ? parseFloat(a.display_balance) : parseFloat(a.balance)
      const sign = displayBal < 0 ? "-" : ""
      const formatted = `${sign}$${Math.abs(displayBal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      return `<option value="${a.id}">${escapeHtml(a.name)}  —  ${formatted}</option>`
    }).join("")

    this.modalFromTarget.innerHTML = `<option value="">Select account...</option>${optionsHtml}`
    this.modalToTarget.innerHTML = `<option value="">Select account...</option>${optionsHtml}`

    if (fromId) this.modalFromTarget.value = fromId
    if (toId) this.modalToTarget.value = toId
  }

  openAddModal() {
    this.editingId = null
    this.modalTitleTarget.textContent = "Transfer Money Between Accounts"
    this.modalSaveButtonTarget.textContent = "Transfer"
    this.populateAccountDropdowns()
    this.modalDateTarget.value = new Date().toISOString().slice(0, 10)
    this.modalAmountTarget.value = ""
    this.modalMemoTarget.value = ""
    this._resetBucketFields()
    this.hideModalError()
    this.modalTarget.classList.remove("hidden")
    this.modalFromTarget.focus()
  }

  async openEditModal(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const transfer = this.transfers.find(t => t.id === id)
    if (!transfer) return

    this.editingId = id
    this.modalTitleTarget.textContent = "Edit Transfer Record"
    this.modalSaveButtonTarget.textContent = "Save Changes"
    this.populateAccountDropdowns(transfer.from_account_id, transfer.to_account_id)
    this.modalDateTarget.value = transfer.transfer_date
    this.modalAmountTarget.value = transfer.amount
    this.modalMemoTarget.value = transfer.memo || ""
    this._resetBucketFields()
    this.hideModalError()
    this.modalTarget.classList.remove("hidden")
    this.modalFromTarget.focus()

    // Fetch and pre-populate bucket dropdowns
    if (transfer.from_account_id) {
      await this._fetchBucketsFor(transfer.from_account_id, "from")
      if (transfer.from_bucket_id && this.hasModalFromBucketTarget) {
        this.modalFromBucketTarget.value = String(transfer.from_bucket_id)
      }
    }
    if (transfer.to_account_id) {
      await this._fetchBucketsFor(transfer.to_account_id, "to")
      if (transfer.to_bucket_id && this.hasModalToBucketTarget) {
        this.modalToBucketTarget.value = String(transfer.to_bucket_id)
      }
    }
  }

  closeModal() {
    this.modalTarget.classList.add("hidden")
    this.editingId = null
  }

  showModalError(msg) {
    this.modalErrorTarget.textContent = msg
    this.modalErrorTarget.classList.remove("hidden")
  }

  hideModalError() {
    this.modalErrorTarget.textContent = ""
    this.modalErrorTarget.classList.add("hidden")
  }

  handleModalKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.saveTransfer()
    } else if (event.key === "Escape") {
      this.closeModal()
    }
  }

  // ── Bucket Helpers ──

  async _fetchBucketsFor(accountId, side) {
    if (!this.bucketsUrlValue || !accountId) {
      if (side === "from") { this.fromBuckets = []; this._hideBucketRow("from") }
      else { this.toBuckets = []; this._hideBucketRow("to") }
      return
    }
    try {
      const res = await fetch(`${this.bucketsUrlValue}?account_id=${accountId}`, { headers: { "Accept": "application/json" } })
      const buckets = res.ok ? (await res.json()).filter(b => b.is_active) : []
      if (side === "from") {
        this.fromBuckets = buckets
        this._populateBucketDropdown("from", buckets)
      } else {
        this.toBuckets = buckets
        this._populateBucketDropdown("to", buckets)
      }
    } catch (e) {
      if (side === "from") { this.fromBuckets = []; this._hideBucketRow("from") }
      else { this.toBuckets = []; this._hideBucketRow("to") }
    }
  }

  _populateBucketDropdown(side, buckets) {
    if (buckets.length === 0) { this._hideBucketRow(side); return }
    const rowTarget = side === "from" ? this.modalFromBucketRowTarget : this.modalToBucketRowTarget
    const selectTarget = side === "from" ? this.modalFromBucketTarget : this.modalToBucketTarget
    const defaultLabel = side === "from" ? "No bucket (whole account)" : "Default bucket"
    selectTarget.innerHTML = `<option value="">${defaultLabel}</option>` +
      buckets.map(b => `<option value="${b.id}">${escapeHtml(b.name)} ($${parseFloat(b.current_balance).toFixed(2)})</option>`).join("")
    rowTarget.classList.remove("hidden")
  }

  _hideBucketRow(side) {
    if (side === "from" && this.hasModalFromBucketRowTarget) {
      this.modalFromBucketRowTarget.classList.add("hidden")
      this.modalFromBucketTarget.value = ""
    }
    if (side === "to" && this.hasModalToBucketRowTarget) {
      this.modalToBucketRowTarget.classList.add("hidden")
      this.modalToBucketTarget.value = ""
    }
  }

  _resetBucketFields() {
    this.fromBuckets = []
    this.toBuckets = []
    this._hideBucketRow("from")
    this._hideBucketRow("to")
    if (this.hasBucketHelperTextTarget) this.bucketHelperTextTarget.classList.add("hidden")
  }

  onFromAccountChange(event) {
    const val = event.target.value
    if (val) { this._fetchBucketsFor(Number(val), "from").then(() => this._updateBucketHelperText()) }
    else { this._hideBucketRow("from"); this.fromBuckets = []; this._updateBucketHelperText() }
  }

  onToAccountChange(event) {
    const val = event.target.value
    if (val) { this._fetchBucketsFor(Number(val), "to").then(() => this._updateBucketHelperText()) }
    else { this._hideBucketRow("to"); this.toBuckets = []; this._updateBucketHelperText() }
  }

  onBucketChange() {
    this._updateBucketHelperText()
  }

  _updateBucketHelperText() {
    if (!this.hasBucketHelperTextTarget) return
    const fromId = this.modalFromTarget.value
    const toId = this.modalToTarget.value
    const fromBucket = this.hasModalFromBucketTarget ? this.modalFromBucketTarget.value : ""
    const toBucket = this.hasModalToBucketTarget ? this.modalToBucketTarget.value : ""

    if (fromId && fromId === toId && fromBucket && toBucket && fromBucket !== toBucket) {
      this.bucketHelperTextTarget.classList.remove("hidden")
    } else {
      this.bucketHelperTextTarget.classList.add("hidden")
    }
  }

  // ── Save (Create / Update) ──

  async saveTransfer() {
    const fromId = this.modalFromTarget.value
    const toId = this.modalToTarget.value
    const date = this.modalDateTarget.value
    const amount = parseFloat(this.modalAmountTarget.value)
    const memo = this.modalMemoTarget.value.trim()

    // Validation
    if (!fromId) return this.showModalError("Please select a From account.")
    if (!toId) return this.showModalError("Please select a To account.")
    if (fromId === toId) {
      const fromBucket = this.hasModalFromBucketTarget ? this.modalFromBucketTarget.value : ""
      const toBucket = this.hasModalToBucketTarget ? this.modalToBucketTarget.value : ""
      if (!fromBucket || !toBucket) return this.showModalError("Select both buckets to move funds within the same account.")
      if (fromBucket === toBucket) return this.showModalError("From Bucket and To Bucket cannot be the same.")
    }
    if (!date) return this.showModalError("Please select a date.")
    if (!amount || amount <= 0) return this.showModalError("Amount must be greater than $0.00.")

    if (!this._skipDateValidation) {
      const dateOk = await this._validateTransferDate(date)
      if (!dateOk) return
    }
    this._skipDateValidation = false

    const fromBucketId = this.hasModalFromBucketTarget ? this.modalFromBucketTarget.value || null : null
    const toBucketId = this.hasModalToBucketTarget ? this.modalToBucketTarget.value || null : null

    const body = {
      transfer_master: {
        from_account_id: fromId,
        to_account_id: toId,
        transfer_date: date,
        amount: amount,
        memo: memo || null,
        from_bucket_id: fromBucketId,
        to_bucket_id: toBucketId
      }
    }

    try {
      const isEdit = this.editingId !== null
      const url = isEdit ? `${this.apiUrlValue}/${this.editingId}` : this.apiUrlValue
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const err = await res.json()
        return this.showModalError(err.errors ? err.errors.join(", ") : "Failed to save transfer.")
      }

      this.closeModal()
      await this.fetchAll()
    } catch (e) {
      this.showModalError("Network error. Please try again.")
    }
  }

  // ── Delete ──

  async confirmDelete(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const transfer = this.transfers.find(t => t.id === id)
    if (!transfer) return

    // Check if transfer date falls outside the open month
    if (this.openMonthUrlValue && transfer.transfer_date) {
      try {
        const res = await fetch(this.openMonthUrlValue, { headers: { "Accept": "application/json" } })
        if (res.ok) {
          const openMonth = await res.json()
          const [year, month] = transfer.transfer_date.split("-").map(Number)
          if (year !== openMonth.current_year || month !== openMonth.current_month) {
            const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" })
            const openMonthName = new Date(openMonth.current_year, openMonth.current_month - 1).toLocaleString("en-US", { month: "long" })
            this.deleteBlockedMessageTarget.innerHTML =
              `This transfer is dated <strong class="text-gray-900 dark:text-white">${monthName} ${year}</strong>, which is outside the current open month <strong class="text-gray-900 dark:text-white">${openMonthName} ${openMonth.current_year}</strong>. You can only delete transfers within the open month.`
            this.deleteBlockedModalTarget.classList.remove("hidden")
            return
          }
        }
      } catch (e) {
        // If check fails, allow delete to proceed
      }
    }

    this.deletingId = id
    this.deleteModalTarget.classList.remove("hidden")
  }

  closeDeleteBlocked() {
    this.deleteBlockedModalTarget.classList.add("hidden")
  }

  cancelDelete() {
    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
  }

  async executeDelete() {
    if (!this.deletingId) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": this.csrfTokenValue
        }
      })

      if (!res.ok) {
        alert("Failed to delete transfer.")
        return
      }

      this.deleteModalTarget.classList.add("hidden")
      this.deletingId = null
      await this.fetchAll()
    } catch (e) {
      alert("Network error. Please try again.")
    }
  }

  // ── Date Validation Against Open Month ──

  async _validateTransferDate(transferDate) {
    if (!this.openMonthUrlValue) return true
    try {
      const res = await fetch(this.openMonthUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return true
      const openMonth = await res.json()
      const [year, month] = transferDate.split("-").map(Number)
      if (year === openMonth.current_year && month === openMonth.current_month) return true

      const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" })
      const openMonthName = new Date(openMonth.current_year, openMonth.current_month - 1).toLocaleString("en-US", { month: "long" })
      this._pendingTransferDate = transferDate
      this.dateWarningMessageTarget.innerHTML =
        `The transfer date <strong class="text-gray-900 dark:text-white">${monthName} ${year}</strong> falls outside the current open month <strong class="text-gray-900 dark:text-white">${openMonthName} ${openMonth.current_year}</strong>.<br><br>Would you like to close the current month and advance to <strong class="text-gray-900 dark:text-white">${monthName} ${year}</strong>?`
      this.dateWarningModalTarget.classList.remove("hidden")
      return false
    } catch (e) {
      return true
    }
  }

  async proceedDateWarning() {
    this.dateWarningModalTarget.classList.add("hidden")
    const [year, month] = this._pendingTransferDate.split("-").map(Number)
    try {
      await fetch(this.openMonthUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ open_month_master: { current_year: year, current_month: month } })
      })
    } catch (e) {
      // If month advance fails, still try to save
    }
    this._skipDateValidation = true
    this.saveTransfer()
  }

  cancelDateWarning() {
    this.dateWarningModalTarget.classList.add("hidden")
    this._pendingTransferDate = null
  }

  // ── Formatting ──

  formatDate(dateStr) {
    if (!dateStr) return ""
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  formatCurrency(val) {
    return "$" + parseFloat(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
}
