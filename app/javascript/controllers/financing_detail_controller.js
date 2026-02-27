import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "tabBtn", "tabPanel",
    // Schedule
    "scheduleBody", "scheduleSummary", "generateBtn", "schedulePagination",
    // Payments
    "paymentsBody",
    // Simulation
    "simExtraMonthly", "simLumpSum", "simLumpPeriod",
    "simResults", "simPlaceholder", "simInterestSaved", "simMonthsSaved", "simPayoffDate",
    "simComparisonBody",
    // Payment modal
    "paymentModal", "paymentModalTitle", "payDate", "payAmount",
    "payManualToggle", "payAutoPreview", "payPreviewBreakdown",
    "payManualFields", "payInterest", "payPrincipal", "payExtraPrincipal", "payEscrow",
    "payNotes", "payError",
    // Delete modal
    "deletePaymentModal",
    // Metrics
    "instrumentName", "currentPrincipal", "balanceMetric"
  ]

  static values = {
    instrumentId: Number,
    paymentsUrl: String,
    scheduleUrl: String,
    generateUrl: String,
    simulateUrl: String,
    reconcileUrl: String,
    instrumentUrl: String,
    listUrl: String,
    csrfToken: String
  }

  connect() {
    this.scheduleEntries = []
    this.payments = []
    this.schedulePageSize = 24
    this.schedulePage = 0
    this.editingPaymentId = null
    this.deletingPaymentId = null
    this.loadedTabs = new Set()
    this.loadSchedule()
  }

  // === Tab switching ===
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.tabBtnTargets.forEach(btn => {
      const isActive = btn.dataset.tab === tab
      btn.classList.toggle("border-brand-600", isActive)
      btn.classList.toggle("text-brand-600", isActive)
      btn.classList.toggle("dark:border-brand-400", isActive)
      btn.classList.toggle("dark:text-brand-400", isActive)
      btn.classList.toggle("border-transparent", !isActive)
      btn.classList.toggle("text-gray-500", !isActive)
      btn.classList.toggle("dark:text-gray-400", !isActive)
    })
    this.tabPanelTargets.forEach(panel => {
      panel.classList.toggle("hidden", panel.dataset.tab !== tab)
    })
    // Lazy-load tab content
    if (!this.loadedTabs.has(tab)) {
      this.loadedTabs.add(tab)
      if (tab === "payments") this.loadPayments()
    }
  }

  // === Amortization Schedule ===
  async loadSchedule() {
    try {
      const resp = await fetch(this.scheduleUrlValue, {
        credentials: "same-origin",
        headers: { "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue }
      })
      const data = await resp.json()
      this.scheduleEntries = data.entries || []
      this.schedulePersisted = data.persisted
      this.scheduleSummaryData = data.summary
      this.schedulePage = 0
      this.renderSchedule()
      this.renderScheduleSummary()
      this.loadedTabs.add("schedule")
    } catch (err) {
      this.scheduleBodyTarget.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-red-500">Error loading schedule.</td></tr>`
    }
  }

  renderSchedule() {
    const entries = this.scheduleEntries
    if (!entries.length) {
      this.scheduleBodyTarget.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No schedule generated yet. Click "Generate Schedule" to create one.</td></tr>`
      this.schedulePaginationTarget.classList.add("hidden")
      return
    }

    const start = this.schedulePage * this.schedulePageSize
    const page = entries.slice(start, start + this.schedulePageSize)
    const isLast = (e) => e === entries[entries.length - 1]

    this.scheduleBodyTarget.innerHTML = page.map(e => {
      const rowClass = e.is_actual
        ? "bg-green-50 dark:bg-green-900/10"
        : isLast(e) ? "bg-yellow-50 dark:bg-yellow-900/10 font-semibold" : ""
      return `<tr class="${rowClass}">
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${e.period_number}${e.is_actual ? ' <span class="text-green-600 dark:text-green-400 text-xs">✓</span>' : ''}</td>
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${this.fmtDate(e.due_date)}</td>
        <td class="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300 tabular-nums">${this.fmtCurrency(e.beginning_balance)}</td>
        <td class="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300 tabular-nums">${this.fmtCurrency(e.payment_amount)}</td>
        <td class="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400 tabular-nums">${this.fmtCurrency(e.interest_amount)}</td>
        <td class="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400 tabular-nums">${this.fmtCurrency(e.principal_amount)}</td>
        <td class="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-white tabular-nums">${this.fmtCurrency(e.ending_balance)}</td>
      </tr>`
    }).join("")

    // Pagination
    const totalPages = Math.ceil(entries.length / this.schedulePageSize)
    if (totalPages > 1) {
      this.schedulePaginationTarget.classList.remove("hidden")
      this.schedulePaginationTarget.innerHTML = `
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Page ${this.schedulePage + 1} of ${totalPages} (${entries.length} periods)
        </span>
        <div class="flex space-x-2">
          <button type="button" data-action="click->financing-detail#prevSchedulePage"
                  class="px-3 py-1 text-sm border rounded-lg ${this.schedulePage === 0 ? 'opacity-50 cursor-not-allowed text-gray-400 border-gray-200' : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                  ${this.schedulePage === 0 ? 'disabled' : ''}>Previous</button>
          <button type="button" data-action="click->financing-detail#nextSchedulePage"
                  class="px-3 py-1 text-sm border rounded-lg ${this.schedulePage >= totalPages - 1 ? 'opacity-50 cursor-not-allowed text-gray-400 border-gray-200' : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                  ${this.schedulePage >= totalPages - 1 ? 'disabled' : ''}>Next</button>
        </div>`
    } else {
      this.schedulePaginationTarget.classList.add("hidden")
    }
  }

  renderScheduleSummary() {
    const s = this.scheduleSummaryData
    if (!s) {
      this.scheduleSummaryTarget.textContent = "No schedule data."
      return
    }
    const status = this.schedulePersisted ? "" : " (preview — not yet saved)"
    this.scheduleSummaryTarget.innerHTML = `
      <span class="font-medium">${s.total_payments} payments</span> &middot;
      Total Interest: <span class="text-red-600 dark:text-red-400 font-medium">${this.fmtCurrency(s.total_interest)}</span> &middot;
      Total Cost: <span class="font-medium">${this.fmtCurrency(s.total_cost)}</span> &middot;
      Payoff: <span class="font-medium">${this.fmtDate(s.payoff_date)}</span>${status}`
  }

  prevSchedulePage() { if (this.schedulePage > 0) { this.schedulePage--; this.renderSchedule() } }
  nextSchedulePage() {
    const totalPages = Math.ceil(this.scheduleEntries.length / this.schedulePageSize)
    if (this.schedulePage < totalPages - 1) { this.schedulePage++; this.renderSchedule() }
  }

  async generateSchedule() {
    this.generateBtnTarget.disabled = true
    this.generateBtnTarget.textContent = "Generating..."
    try {
      const resp = await fetch(this.generateUrlValue, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: "{}"
      })
      const data = await resp.json()
      this.scheduleEntries = data.entries || []
      this.schedulePersisted = data.persisted
      this.scheduleSummaryData = data.summary
      this.schedulePage = 0
      this.renderSchedule()
      this.renderScheduleSummary()
    } catch (err) {
      console.error("Generate schedule error:", err)
    } finally {
      this.generateBtnTarget.disabled = false
      this.generateBtnTarget.innerHTML = `<svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Generate Schedule`
    }
  }

  // === Payment History ===
  async loadPayments() {
    try {
      const resp = await fetch(this.paymentsUrlValue, {
        credentials: "same-origin",
        headers: { "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue }
      })
      this.payments = await resp.json()
      this.renderPayments()
    } catch (err) {
      this.paymentsBodyTarget.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-sm text-red-500">Error loading payments.</td></tr>`
    }
  }

  renderPayments() {
    if (!this.payments.length) {
      this.paymentsBodyTarget.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No payments recorded yet.</td></tr>`
      return
    }
    this.paymentsBodyTarget.innerHTML = this.payments.map(p => `
      <tr>
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${p.payment_number}</td>
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${this.fmtDate(p.payment_date)}</td>
        <td class="px-4 py-2 text-sm text-right text-gray-900 dark:text-white font-medium tabular-nums">${this.fmtCurrency(p.total_amount)}</td>
        <td class="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400 tabular-nums">${this.fmtCurrency(p.interest_amount)}</td>
        <td class="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400 tabular-nums">${this.fmtCurrency(p.principal_amount)}</td>
        <td class="px-4 py-2 text-sm text-right text-blue-600 dark:text-blue-400 tabular-nums">${this.fmtCurrency(p.extra_principal_amount)}</td>
        <td class="px-4 py-2 text-sm text-right text-gray-900 dark:text-white font-medium tabular-nums">${this.fmtCurrency(p.principal_balance_after)}</td>
        <td class="px-4 py-2 text-right">
          <button data-action="click->financing-detail#editPayment" data-payment-id="${p.id}"
                  class="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 text-sm mr-2">Edit</button>
          <button data-action="click->financing-detail#deletePayment" data-payment-id="${p.id}"
                  class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm">Delete</button>
        </td>
      </tr>`).join("")
  }

  // === Payment Modal ===
  openAddPayment() {
    this.editingPaymentId = null
    this.paymentModalTitleTarget.textContent = "Record Payment"
    this.payDateTarget.value = new Date().toISOString().split("T")[0]
    this.payAmountTarget.value = ""
    this.payManualToggleTarget.checked = false
    this.payManualFieldsTarget.classList.add("hidden")
    this.payAutoPreviewTarget.classList.remove("hidden")
    this.payInterestTarget.value = ""
    this.payPrincipalTarget.value = ""
    this.payExtraPrincipalTarget.value = ""
    this.payEscrowTarget.value = ""
    this.payNotesTarget.value = ""
    this.payErrorTarget.classList.add("hidden")
    this.payPreviewBreakdownTarget.textContent = "Enter an amount to see the breakdown."
    this.paymentModalTarget.classList.remove("hidden")
  }

  editPayment(e) {
    const id = parseInt(e.currentTarget.dataset.paymentId)
    const p = this.payments.find(x => x.id === id)
    if (!p) return

    this.editingPaymentId = id
    this.paymentModalTitleTarget.textContent = "Edit Payment"
    this.payDateTarget.value = p.payment_date
    this.payAmountTarget.value = p.total_amount
    this.payManualToggleTarget.checked = true
    this.payManualFieldsTarget.classList.remove("hidden")
    this.payAutoPreviewTarget.classList.add("hidden")
    this.payInterestTarget.value = p.interest_amount
    this.payPrincipalTarget.value = p.principal_amount
    this.payExtraPrincipalTarget.value = p.extra_principal_amount
    this.payEscrowTarget.value = p.escrow_amount
    this.payNotesTarget.value = p.notes || ""
    this.payErrorTarget.classList.add("hidden")
    this.paymentModalTarget.classList.remove("hidden")
  }

  cancelPayment() { this.paymentModalTarget.classList.add("hidden") }

  toggleManualAllocation() {
    const manual = this.payManualToggleTarget.checked
    this.payManualFieldsTarget.classList.toggle("hidden", !manual)
    this.payAutoPreviewTarget.classList.toggle("hidden", manual)
  }

  async savePayment() {
    const date = this.payDateTarget.value
    const amount = parseFloat(this.payAmountTarget.value)
    if (!date || !amount || amount <= 0) {
      this.showPayError("Payment date and a positive amount are required.")
      return
    }

    const manual = this.payManualToggleTarget.checked
    const body = {
      financing_payment: {
        payment_date: date,
        total_amount: amount,
        notes: this.payNotesTarget.value || null,
        manual_allocation: manual
      }
    }
    if (manual) {
      body.financing_payment.interest_amount = parseFloat(this.payInterestTarget.value) || 0
      body.financing_payment.principal_amount = parseFloat(this.payPrincipalTarget.value) || 0
      body.financing_payment.extra_principal_amount = parseFloat(this.payExtraPrincipalTarget.value) || 0
      body.financing_payment.escrow_amount = parseFloat(this.payEscrowTarget.value) || 0
    }

    const url = this.editingPaymentId
      ? `${this.paymentsUrlValue}/${this.editingPaymentId}`
      : this.paymentsUrlValue
    const method = this.editingPaymentId ? "PUT" : "POST"

    try {
      const resp = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify(body)
      })
      const data = await resp.json()
      if (!resp.ok) {
        this.showPayError(data.errors?.join(", ") || "Failed to save payment.")
        return
      }

      this.paymentModalTarget.classList.add("hidden")
      // Reload both payments and schedule
      await Promise.all([this.loadPayments(), this.loadSchedule()])
      this.refreshInstrumentMetrics()
    } catch (err) {
      this.showPayError("Network error — please try again.")
    }
  }

  showPayError(msg) {
    this.payErrorTarget.textContent = msg
    this.payErrorTarget.classList.remove("hidden")
  }

  // === Delete Payment ===
  deletePayment(e) {
    this.deletingPaymentId = parseInt(e.currentTarget.dataset.paymentId)
    this.deletePaymentModalTarget.classList.remove("hidden")
  }
  cancelDeletePayment() { this.deletePaymentModalTarget.classList.add("hidden") }

  async confirmDeletePayment() {
    if (!this.deletingPaymentId) return
    try {
      await fetch(`${this.paymentsUrlValue}/${this.deletingPaymentId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      this.deletePaymentModalTarget.classList.add("hidden")
      await Promise.all([this.loadPayments(), this.loadSchedule()])
      this.refreshInstrumentMetrics()
    } catch (err) {
      console.error("Delete payment error:", err)
    }
  }

  // === Payoff Simulation ===
  async runSimulation() {
    const extra = parseFloat(this.simExtraMonthlyTarget.value) || 0
    const lump = parseFloat(this.simLumpSumTarget.value) || 0
    const period = parseInt(this.simLumpPeriodTarget.value) || 1

    if (extra === 0 && lump === 0) {
      alert("Enter at least one extra payment amount to simulate.")
      return
    }

    try {
      const resp = await fetch(this.simulateUrlValue, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({
          extra_monthly_payment: extra,
          lump_sum_amount: lump,
          lump_sum_period: period
        })
      })
      const data = await resp.json()
      this.renderSimResults(data)
    } catch (err) {
      console.error("Simulation error:", err)
    }
  }

  renderSimResults(data) {
    this.simPlaceholderTarget.classList.add("hidden")
    this.simResultsTarget.classList.remove("hidden")

    this.simInterestSavedTarget.textContent = this.fmtCurrency(data.savings.interest_saved)
    this.simMonthsSavedTarget.textContent = `${data.savings.months_saved} months`
    this.simPayoffDateTarget.textContent = this.fmtDate(data.accelerated.payoff_date)

    const rows = [
      { label: "Total Payments", orig: data.original.total_payments, accel: data.accelerated.total_payments, isCurrency: false },
      { label: "Total Interest", orig: data.original.total_interest, accel: data.accelerated.total_interest, isCurrency: true },
      { label: "Payoff Date", orig: this.fmtDate(data.original.payoff_date), accel: this.fmtDate(data.accelerated.payoff_date), isCurrency: false }
    ]

    this.simComparisonBodyTarget.innerHTML = rows.map(r => `
      <tr>
        <td class="py-2 text-sm text-gray-600 dark:text-gray-400">${r.label}</td>
        <td class="py-2 text-sm text-right text-gray-900 dark:text-white tabular-nums">${r.isCurrency ? this.fmtCurrency(r.orig) : r.orig}</td>
        <td class="py-2 text-sm text-right font-medium text-green-600 dark:text-green-400 tabular-nums">${r.isCurrency ? this.fmtCurrency(r.accel) : r.accel}</td>
      </tr>`).join("")
  }

  // === Helpers ===
  async refreshInstrumentMetrics() {
    try {
      const resp = await fetch(this.instrumentUrlValue, {
        credentials: "same-origin",
        headers: { "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue }
      })
      if (!resp.ok) return
      const data = await resp.json()
      if (this.hasCurrentPrincipalTarget) this.currentPrincipalTarget.textContent = this.fmtCurrency(data.current_principal)
      if (this.hasBalanceMetricTarget) this.balanceMetricTarget.textContent = this.fmtCurrency(data.current_principal)
    } catch (_) {}
  }

  fmtCurrency(val) {
    if (val == null) return "$0.00"
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
  }

  fmtDate(dateStr) {
    if (!dateStr) return "—"
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
}
