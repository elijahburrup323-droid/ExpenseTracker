import { Controller } from "@hotwired/stimulus"
import { iconFor, escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "paginationInfo", "addButton",
    "modal", "modalTitle", "modalFrom", "modalTo", "modalDate", "modalAmount", "modalMemo", "modalError", "modalSaveButton",
    "deleteModal",
    "dateWarningModal", "dateWarningMessage", "deleteBlockedModal", "deleteBlockedMessage"
  ]

  static values = {
    apiUrl: String,
    accountsUrl: String,
    csrfToken: String,
    openMonthUrl: String
  }

  transfers = []
  accounts = []
  editingId = null
  deletingId = null
  page = 1
  perPage = 10

  _skipDateValidation = false
  _pendingSave = null

  connect() {
    this.fetchAll()
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
    } catch (e) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-red-500">Failed to load transfers</td></tr>`
    }
  }

  renderTable() {
    if (this.transfers.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No transfers yet. Click "+ Transfer" to add one.</td></tr>`
      this.paginationInfoTarget.textContent = ""
      return
    }

    const start = (this.page - 1) * this.perPage
    const end = Math.min(start + this.perPage, this.transfers.length)
    const pageItems = this.transfers.slice(start, end)

    this.tableBodyTarget.innerHTML = pageItems.map(t => this.renderRow(t)).join("")
    this.paginationInfoTarget.textContent = `${start + 1}–${end} of ${this.transfers.length}`
  }

  renderRow(t) {
    const date = this.formatDate(t.transfer_date)
    const fromIcon = iconFor(t.from_account_icon_key, t.from_account_color_key)
    const toIcon = iconFor(t.to_account_icon_key, t.to_account_color_key)
    const memo = t.memo ? escapeHtml(t.memo) : ""
    const amount = this.formatCurrency(t.amount)

    return `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${date}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <div class="flex items-center space-x-2">
            ${fromIcon}
            <span>${escapeHtml(t.from_account_name)}</span>
            <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <div class="flex items-center space-x-2">
            ${toIcon}
            <span>${escapeHtml(t.to_account_name)}</span>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">${memo}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">${amount}</td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <div class="flex items-center justify-center space-x-2">
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
    const optionsHtml = activeAccounts.map(a =>
      `<option value="${a.id}">${escapeHtml(a.name)}  —  $${parseFloat(a.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}</option>`
    ).join("")

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
    this.hideModalError()
    this.modalTarget.classList.remove("hidden")
    this.modalFromTarget.focus()
  }

  openEditModal(event) {
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
    this.hideModalError()
    this.modalTarget.classList.remove("hidden")
    this.modalFromTarget.focus()
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
    if (fromId === toId) return this.showModalError("From and To accounts cannot be the same.")
    if (!date) return this.showModalError("Please select a date.")
    if (!amount || amount <= 0) return this.showModalError("Amount must be greater than $0.00.")

    if (!this._skipDateValidation) {
      const dateOk = await this._validateTransferDate(date)
      if (!dateOk) return
    }
    this._skipDateValidation = false

    const body = {
      transfer_master: {
        from_account_id: fromId,
        to_account_id: toId,
        transfer_date: date,
        amount: amount,
        memo: memo || null
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
