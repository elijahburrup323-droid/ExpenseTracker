import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "accountSelect", "monthLabel", "budgetBalance", "externalBalance", "externalLabel",
    "differenceDisplay", "differenceWarning", "fixModeBtn",
    "paymentsBody", "depositsBody", "transfersBody", "adjustmentsBody",
    "paymentsUnreconciled", "depositsUnreconciled", "transfersUnreconciled", "adjustmentsUnreconciled",
    "paymentsTotal", "depositsTotal", "transfersTotal", "adjustmentsTotal",
    "paymentsTotalBottom", "depositsTotalBottom", "transfersTotalBottom", "adjustmentsTotalBottom",
    "paymentStatementCount", "depositStatementCount", "adjustmentStatementCount",
    "paymentCountLabel", "depositCountLabel", "adjustmentCountLabel",
    "recordCount", "searchInput", "readOnlyBanner",
    "mainPanel", "fixModePanel", "emptyState", "dataSections",
    "markReconciledBtn", "fixMarkReconciledBtn",
    "fixModeAmount", "fixModeGuidance",
    "fixPaymentsBody", "fixDepositsBody", "fixSuggestionsBody", "fixDepositSearch",
    "adjustmentModal", "adjDate", "adjDescription", "adjAmount", "adjNotes", "adjError"
  ]

  static values = {
    dataUrl: String,
    toggleUrl: String,
    outsideBalanceUrl: String,
    statementCountsUrl: String,
    markReconciledUrl: String,
    balanceAdjustmentsUrl: String,
    csrfToken: String,
    initialYear: Number,
    initialMonth: Number
  }

  connect() {
    this.year = this.initialYearValue
    this.month = this.initialMonthValue
    this.data_cache = null
    this.isReadOnly = false
  }

  selectAccount() {
    const accountId = this.accountSelectTarget.value
    if (!accountId) {
      this.emptyStateTarget.classList.remove("hidden")
      this.dataSectionsTarget.classList.add("hidden")
      return
    }
    this.fetchData()
  }

  prevMonth() {
    this.month--
    if (this.month < 1) { this.month = 12; this.year-- }
    this._updateMonthLabel()
    if (this.accountSelectTarget.value) this.fetchData()
  }

  nextMonth() {
    this.month++
    if (this.month > 12) { this.month = 1; this.year++ }
    this._updateMonthLabel()
    if (this.accountSelectTarget.value) this.fetchData()
  }

  async fetchData() {
    const accountId = this.accountSelectTarget.value
    if (!accountId) return

    try {
      const url = `${this.dataUrlValue}?account_id=${accountId}&year=${this.year}&month=${this.month}`
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (!res.ok) return

      const data = await res.json()
      this.data_cache = data
      this.isReadOnly = data.is_read_only

      this.emptyStateTarget.classList.add("hidden")
      this.dataSectionsTarget.classList.remove("hidden")

      // Read-only banner
      if (this.isReadOnly) {
        this.readOnlyBannerTarget.classList.remove("hidden")
      } else {
        this.readOnlyBannerTarget.classList.add("hidden")
      }

      // Update account name in labels
      const name = data.account.name
      if (this.hasExternalLabelTarget) this.externalLabelTarget.textContent = name
      if (this.hasPaymentCountLabelTarget) this.paymentCountLabelTarget.textContent = `${name} Count:`
      if (this.hasDepositCountLabelTarget) this.depositCountLabelTarget.textContent = `${name} Count:`
      if (this.hasAdjustmentCountLabelTarget) this.adjustmentCountLabelTarget.textContent = `${name} Count:`

      // Top summary
      this.budgetBalanceTarget.textContent = this._currency(data.budget_balance)
      if (data.outside_balance !== null && data.outside_balance !== undefined) {
        this.externalBalanceTarget.value = data.outside_balance
      } else {
        this.externalBalanceTarget.value = ""
      }

      // Statement counts
      this.paymentStatementCountTarget.value = data.statement_counts.payments
      this.depositStatementCountTarget.value = data.statement_counts.deposits
      this.adjustmentStatementCountTarget.value = data.statement_counts.adjustments

      // Record count = total transactions
      const totalRecords = data.payments.length + data.deposits.length + data.transfers.length + data.adjustments.length
      this.recordCountTarget.value = totalRecords

      // Disable inputs if read-only
      this.externalBalanceTarget.disabled = this.isReadOnly
      this.paymentStatementCountTarget.disabled = this.isReadOnly
      this.depositStatementCountTarget.disabled = this.isReadOnly
      this.adjustmentStatementCountTarget.disabled = this.isReadOnly

      this._renderPayments(data.payments)
      this._renderDeposits(data.deposits)
      this._renderTransfers(data.transfers)
      this._renderAdjustments(data.adjustments)
      this._updateCounts(data)
      this._updateTotals(data)
      this._updateDifference()
    } catch (e) {
      console.error("Reconciliation fetch error:", e)
    }
  }

  async toggleReconciled(event) {
    if (this.isReadOnly) { event.preventDefault(); return }

    const checkbox = event.target
    const type = checkbox.dataset.type
    const id = checkbox.dataset.id
    const reconciled = checkbox.checked

    try {
      const res = await fetch(this.toggleUrlValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ type, id, reconciled })
      })

      if (!res.ok) {
        checkbox.checked = !reconciled
        return
      }

      // Update local cache
      if (this.data_cache) {
        const list = this.data_cache[type + "s"] || this.data_cache[type === "adjustment" ? "adjustments" : type + "s"]
        const item = list?.find(i => i.id == id)
        if (item) item.reconciled = reconciled

        // Recalculate unreconciled counts
        this._updateCountsFromCache()
        this._updateDifference()
      }
    } catch (e) {
      checkbox.checked = !reconciled
    }
  }

  async updateExternalBalance() {
    if (this.isReadOnly) return
    const accountId = this.accountSelectTarget.value
    if (!accountId) return

    try {
      await fetch(this.outsideBalanceUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({
          account_id: accountId,
          year: this.year,
          month: this.month,
          outside_balance: this.externalBalanceTarget.value || 0
        })
      })
      this._updateDifference()
    } catch (e) {
      // silently fail
    }
  }

  async updateStatementCount(event) {
    if (this.isReadOnly) return
    const accountId = this.accountSelectTarget.value
    if (!accountId) return

    const section = event.target.dataset.section
    const body = { account_id: accountId, year: this.year, month: this.month }

    if (section === "payments") body.payment_count = event.target.value
    if (section === "deposits") body.deposit_count = event.target.value
    if (section === "adjustments") body.adjustment_count = event.target.value

    try {
      await fetch(this.statementCountsUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify(body)
      })
    } catch (e) {
      // silently fail
    }
  }

  search() {
    const query = this.searchInputTarget.value.trim()
    if (!query) {
      // Show all rows
      this.element.querySelectorAll("tr[data-amount]").forEach(r => r.classList.remove("hidden"))
      return
    }

    const num = parseFloat(query)
    if (isNaN(num)) return

    this.element.querySelectorAll("tr[data-amount]").forEach(row => {
      const amt = parseFloat(row.dataset.amount)
      if (Math.abs(amt) === Math.abs(num) || amt.toFixed(2) === num.toFixed(2)) {
        row.classList.remove("hidden")
      } else {
        row.classList.add("hidden")
      }
    })
  }

  enterFixMode() {
    this.mainPanelTarget.classList.add("hidden")
    this.fixModePanelTarget.classList.remove("hidden")
    this._renderFixMode()
  }

  exitFixMode() {
    this.fixModePanelTarget.classList.add("hidden")
    this.mainPanelTarget.classList.remove("hidden")
    // Refresh data
    this.fetchData()
  }

  async markReconciled() {
    const accountId = this.accountSelectTarget.value
    if (!accountId) return

    try {
      const res = await fetch(this.markReconciledUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({
          account_id: accountId,
          year: this.year,
          month: this.month
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        alert("Account reconciled successfully!")
        this.fetchData()
      } else {
        alert(data.error || "Failed to mark as reconciled.")
      }
    } catch (e) {
      alert("Network error. Please try again.")
    }
  }

  // Fix Mode: add missing payment (navigate to Payments page)
  addMissingPayment() {
    window.location.href = "/payments"
  }

  // Fix Mode: add missing deposit (navigate to Deposits page)
  addMissingDeposit() {
    window.location.href = "/income_entries"
  }

  showAddAdjustmentModal() {
    // Pre-fill date with first of current reconciliation month
    const dateStr = `${this.year}-${String(this.month).padStart(2, "0")}-01`
    this.adjDateTarget.value = dateStr
    this.adjDescriptionTarget.value = ""
    this.adjAmountTarget.value = ""
    this.adjNotesTarget.value = ""
    this.adjErrorTarget.classList.add("hidden")
    this.adjustmentModalTarget.classList.remove("hidden")
  }

  closeAdjustmentModal() {
    this.adjustmentModalTarget.classList.add("hidden")
  }

  async saveAdjustment() {
    const accountId = this.accountSelectTarget.value
    if (!accountId) return

    const date = this.adjDateTarget.value
    const description = this.adjDescriptionTarget.value.trim()
    const amount = parseFloat(this.adjAmountTarget.value)
    const notes = this.adjNotesTarget.value.trim()

    if (!date || !description || isNaN(amount)) {
      this.adjErrorTarget.textContent = "Date, description, and amount are required."
      this.adjErrorTarget.classList.remove("hidden")
      return
    }

    try {
      const res = await fetch(this.balanceAdjustmentsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({
          balance_adjustment: {
            account_id: accountId,
            adjustment_date: date,
            description: description,
            amount: amount,
            notes: notes
          }
        })
      })

      if (res.ok) {
        this.closeAdjustmentModal()
        this.fetchData()
      } else {
        const data = await res.json()
        this.adjErrorTarget.textContent = (data.errors || ["Failed to save."]).join(", ")
        this.adjErrorTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.adjErrorTarget.textContent = "Network error."
      this.adjErrorTarget.classList.remove("hidden")
    }
  }

  autoMatch() {
    // Simple auto-match: look for transactions with same absolute amount
    if (!this.data_cache) return
    const suggestions = []
    const unmatched_p = this.data_cache.payments.filter(p => !p.reconciled)
    const unmatched_d = this.data_cache.deposits.filter(d => !d.reconciled)

    // Compare statement counts vs BudgetHQ counts
    const stmtPayments = parseInt(this.paymentStatementCountTarget.value) || 0
    const stmtDeposits = parseInt(this.depositStatementCountTarget.value) || 0
    const bhqPayments = this.data_cache.payments.length
    const bhqDeposits = this.data_cache.deposits.length

    if (stmtPayments > 0 && stmtPayments !== bhqPayments) {
      suggestions.push({
        text: `Payment count mismatch: Statement has ${stmtPayments}, BudgetHQ has ${bhqPayments}`,
        type: "warning"
      })
    }
    if (stmtDeposits > 0 && stmtDeposits !== bhqDeposits) {
      suggestions.push({
        text: `Deposit count mismatch: Statement has ${stmtDeposits}, BudgetHQ has ${bhqDeposits}`,
        type: "warning"
      })
    }

    if (unmatched_p.length === 0 && unmatched_d.length === 0) {
      suggestions.push({ text: "All transactions are reconciled!", type: "success" })
    }

    this._renderSuggestions(suggestions)
  }

  searchFixDeposits() {
    if (!this.data_cache) return
    const query = this.fixDepositSearchTarget.value.trim().toLowerCase()
    const items = this.fixDepositsBodyTarget.querySelectorAll("[data-fix-item]")
    items.forEach(item => {
      if (!query || item.textContent.toLowerCase().includes(query)) {
        item.classList.remove("hidden")
      } else {
        item.classList.add("hidden")
      }
    })
  }

  // ===================== PRIVATE METHODS =====================

  _updateMonthLabel() {
    const d = new Date(this.year, this.month - 1, 1)
    this.monthLabelTarget.textContent = d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  _renderPayments(payments) {
    if (payments.length === 0) {
      this.paymentsBodyTarget.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No payments this month</td></tr>`
      return
    }
    this.paymentsBodyTarget.innerHTML = payments.map(p => this._txnRow(p, "payment")).join("")
  }

  _renderDeposits(deposits) {
    if (deposits.length === 0) {
      this.depositsBodyTarget.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No deposits this month</td></tr>`
      return
    }
    this.depositsBodyTarget.innerHTML = deposits.map(d => this._txnRow(d, "deposit")).join("")
  }

  _renderTransfers(transfers) {
    if (transfers.length === 0) {
      this.transfersBodyTarget.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No transfers this month</td></tr>`
      return
    }
    this.transfersBodyTarget.innerHTML = transfers.map(t => this._txnRow(t, "transfer")).join("")
  }

  _renderAdjustments(adjustments) {
    if (adjustments.length === 0) {
      this.adjustmentsBodyTarget.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No adjustments this month</td></tr>`
      return
    }
    this.adjustmentsBodyTarget.innerHTML = adjustments.map(a => this._txnRow(a, "adjustment")).join("")
  }

  _txnRow(item, type) {
    const dateStr = item.date
    const label = item.payee || item.source || item.description || ""
    const amt = item.amount
    const notes = item.notes || item.memo || ""
    const checked = item.reconciled ? "checked" : ""
    const disabled = this.isReadOnly ? "disabled" : ""

    const amtColor = amt < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
    const amtDisplay = this._currency(Math.abs(amt))
    const sign = amt < 0 ? "-" : ""

    return `
      <tr data-amount="${amt}" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">${this._esc(dateStr)}</td>
        <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">${this._esc(label)}</td>
        <td class="px-4 py-2 text-sm font-medium ${amtColor} text-right whitespace-nowrap">${sign}${amtDisplay}</td>
        <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-[12rem] truncate">${this._esc(notes)}</td>
        <td class="px-4 py-2 text-center">
          <input type="checkbox" ${checked} ${disabled}
                 data-type="${type}" data-id="${item.id}"
                 data-action="change->reconciliation#toggleReconciled"
                 class="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 cursor-pointer">
        </td>
      </tr>`
  }

  _updateCounts(data) {
    this.paymentsUnreconciledTarget.textContent = `(${data.unreconciled.payments} Unreconciled)`
    this.depositsUnreconciledTarget.textContent = `(${data.unreconciled.deposits} Unreconciled)`
    this.transfersUnreconciledTarget.textContent = `(${data.unreconciled.transfers} Unreconciled)`
    this.adjustmentsUnreconciledTarget.textContent = `(${data.unreconciled.adjustments} Unreconciled)`
  }

  _updateCountsFromCache() {
    if (!this.data_cache) return
    const d = this.data_cache
    this.paymentsUnreconciledTarget.textContent = `(${d.payments.filter(p => !p.reconciled).length} Unreconciled)`
    this.depositsUnreconciledTarget.textContent = `(${d.deposits.filter(p => !p.reconciled).length} Unreconciled)`
    this.transfersUnreconciledTarget.textContent = `(${d.transfers.filter(p => !p.reconciled).length} Unreconciled)`
    this.adjustmentsUnreconciledTarget.textContent = `(${d.adjustments.filter(p => !p.reconciled).length} Unreconciled)`
  }

  _updateTotals(data) {
    const pTotal = this._currency(Math.abs(data.totals.payments))
    const dTotal = this._currency(data.totals.deposits)
    const tTotal = this._currency(data.totals.transfers)
    const aTotal = this._currency(data.totals.adjustments)

    const pSign = data.totals.payments > 0 ? "-" : ""
    this.paymentsTotalTarget.textContent = `${pSign}${pTotal}`
    this.paymentsTotalBottomTarget.textContent = `${pSign}${pTotal}`
    this.depositsTotalTarget.textContent = dTotal
    this.depositsTotalBottomTarget.textContent = dTotal
    this.transfersTotalTarget.textContent = tTotal
    this.transfersTotalBottomTarget.textContent = tTotal
    this.adjustmentsTotalTarget.textContent = aTotal
    this.adjustmentsTotalBottomTarget.textContent = aTotal
  }

  _updateDifference() {
    if (!this.data_cache) return

    const budgetBal = this.data_cache.budget_balance || 0
    const externalBal = parseFloat(this.externalBalanceTarget.value) || 0
    const diff = (externalBal - budgetBal)
    const absDiff = Math.abs(diff).toFixed(2)

    const isZero = Math.abs(diff) < 0.005

    if (isZero) {
      this.differenceDisplayTarget.textContent = "$0.00"
      this.differenceDisplayTarget.className = "text-2xl font-bold text-green-600 dark:text-green-400"
      this.differenceWarningTarget.classList.add("hidden")
      this.fixModeBtnTarget.classList.add("hidden")
      this.markReconciledBtnTarget.disabled = false
      if (this.hasFixMarkReconciledBtnTarget) this.fixMarkReconciledBtnTarget.disabled = false
    } else {
      const sign = diff > 0 ? "+" : "-"
      this.differenceDisplayTarget.textContent = `${sign}${this._currency(parseFloat(absDiff))}`
      this.differenceDisplayTarget.className = "text-2xl font-bold text-red-600 dark:text-red-400"
      this.differenceWarningTarget.classList.remove("hidden")
      if (!this.isReadOnly) this.fixModeBtnTarget.classList.remove("hidden")
      this.markReconciledBtnTarget.disabled = true
      if (this.hasFixMarkReconciledBtnTarget) this.fixMarkReconciledBtnTarget.disabled = true
    }

    // Also check if external balance is empty
    if (!this.externalBalanceTarget.value) {
      this.markReconciledBtnTarget.disabled = true
      if (this.hasFixMarkReconciledBtnTarget) this.fixMarkReconciledBtnTarget.disabled = true
    }
  }

  _renderFixMode() {
    if (!this.data_cache) return

    const diff = (parseFloat(this.externalBalanceTarget.value) || 0) - (this.data_cache.budget_balance || 0)
    const sign = diff > 0 ? "+" : "-"
    this.fixModeAmountTarget.textContent = `${sign}${this._currency(Math.abs(diff))} Out of Balance`

    // Guidance
    const guidance = []
    if (diff < 0) {
      guidance.push("BudgetHQ balance is higher than your statement. You may have a missing payment or an extra deposit in BudgetHQ.")
    } else {
      guidance.push("Your statement balance is higher than BudgetHQ. You may be missing a deposit or have an extra payment in BudgetHQ.")
    }
    this.fixModeGuidanceTarget.textContent = guidance.join(" ")

    // Unmatched payments
    const unmatchedP = this.data_cache.payments.filter(p => !p.reconciled)
    if (unmatchedP.length > 0) {
      this.fixPaymentsBodyTarget.innerHTML = unmatchedP.map(p => `
        <div data-fix-item class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${this._esc(p.payee)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${p.date}</p>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-red-600 dark:text-red-400">-${this._currency(p.amount)}</span>
            <input type="checkbox" ${p.reconciled ? "checked" : ""} ${this.isReadOnly ? "disabled" : ""}
                   data-type="payment" data-id="${p.id}"
                   data-action="change->reconciliation#toggleReconciled"
                   class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500">
          </div>
        </div>`).join("")
    } else {
      this.fixPaymentsBodyTarget.innerHTML = `<p class="text-xs text-gray-400 dark:text-gray-500 text-center py-4">All payments reconciled</p>`
    }

    // Unmatched deposits
    const unmatchedD = this.data_cache.deposits.filter(d => !d.reconciled)
    if (unmatchedD.length > 0) {
      this.fixDepositsBodyTarget.innerHTML = unmatchedD.map(d => `
        <div data-fix-item class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${this._esc(d.source)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${d.date}</p>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-green-600 dark:text-green-400">${this._currency(d.amount)}</span>
            <input type="checkbox" ${d.reconciled ? "checked" : ""} ${this.isReadOnly ? "disabled" : ""}
                   data-type="deposit" data-id="${d.id}"
                   data-action="change->reconciliation#toggleReconciled"
                   class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500">
          </div>
        </div>`).join("")
    } else {
      this.fixDepositsBodyTarget.innerHTML = `<p class="text-xs text-gray-400 dark:text-gray-500 text-center py-4">All deposits reconciled</p>`
    }

    // Suggestions
    this._renderSuggestions([])
    this.autoMatch()
  }

  _renderSuggestions(suggestions) {
    if (suggestions.length === 0) {
      this.fixSuggestionsBodyTarget.innerHTML = `
        <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p class="text-xs text-blue-700 dark:text-blue-300">Click "Auto-Match Suggestions" to analyze your transactions for potential matches and discrepancies.</p>
        </div>`
      return
    }

    this.fixSuggestionsBodyTarget.innerHTML = suggestions.map(s => {
      const colors = s.type === "success"
        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
        : s.type === "warning"
          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
          : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
      return `<div class="p-3 rounded-lg ${colors}"><p class="text-xs">${this._esc(s.text)}</p></div>`
    }).join("")
  }

  _currency(val) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0)
  }

  _esc(str) {
    if (!str) return ""
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
