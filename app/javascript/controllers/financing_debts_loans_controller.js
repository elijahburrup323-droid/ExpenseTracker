import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

const INSTRUMENT_SUBTYPES = [
  { value: "MORTGAGE",        label: "Mortgage" },
  { value: "AUTO_LOAN",       label: "Auto Loan" },
  { value: "STUDENT_LOAN",    label: "Student Loan" },
  { value: "PERSONAL_LOAN",   label: "Personal Loan" },
  { value: "HELOC",           label: "HELOC" },
  { value: "BUSINESS_LOAN",   label: "Business Loan" },
  { value: "PROMISSORY_NOTE", label: "Promissory Note" },
  { value: "OTHER",           label: "Other" }
]

const DEBT_TYPES = [
  { value: "LOAN",                label: "Loan" },
  { value: "MEDICAL_BILL",       label: "Medical Bill" },
  { value: "REPAIR_BILL",        label: "Repair Bill" },
  { value: "CONTRACTOR_BALANCE", label: "Contractor Balance" },
  { value: "PERSONAL_DEBT",      label: "Personal Debt" },
  { value: "TAX_DEBT",           label: "Tax Debt" },
  { value: "OTHER_DEBT",         label: "Other Debt" }
]

const INSTRUMENT_TYPES = [
  { value: "PAYABLE",    label: "Payable (I Owe)" },
  { value: "RECEIVABLE", label: "Receivable (Owed to Me)" }
]

const PAYMENT_FREQUENCIES = [
  { value: "MONTHLY",   label: "Monthly" },
  { value: "BI_WEEKLY", label: "Bi-Weekly" },
  { value: "WEEKLY",    label: "Weekly" }
]

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "total", "debtTypeFilter",
    "instrumentModal", "modalTitle",
    "modalName", "modalInstrumentType", "modalSubtype", "modalDebtType",
    "modalOriginalPrincipal", "modalCurrentPrincipal",
    "modalInterestRate", "modalTermMonths", "modalStartDate",
    "modalMaturityDate", "modalPaymentFrequency", "modalMonthlyPayment",
    "modalLenderOrBorrower", "modalDescription", "modalNetWorth",
    "modalNotes", "modalError",
    "deleteModal", "deleteModalName",
    "quickPaymentModal", "quickPaymentName", "quickPaymentAmount",
    "quickPaymentDate", "quickPaymentNotes", "quickPaymentError"
  ]

  static values = {
    apiUrl: String,
    csrfToken: String
  }

  connect() {
    this.instruments = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.quickPaymentId = null
    this.sortField = "name"
    this.sortDir = "asc"
    this.filterDebtType = ""
    this.fetchAll()
  }

  // ─── Fetch ──────────────────────────────────────────────
  async fetchAll() {
    try {
      const res = await fetch(this.apiUrlValue + "?exclude_subtype=CONTRACT_FOR_DEED", { credentials: "same-origin" })
      this.instruments = await res.json()
      this._rebuildFilterDropdown()
      this.renderTable()
    } catch (e) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-sm text-red-500">Failed to load debts & loans.</td></tr>`
    }
  }

  // ─── Sorting ────────────────────────────────────────────
  toggleSort(event) {
    const field = event.currentTarget.dataset.sortField
    if (this.sortField === field) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc"
    } else {
      this.sortField = field
      this.sortDir = "asc"
    }
    this._updateSortIcons()
    this.renderTable()
  }

  _getSorted() {
    let list = [...this.instruments]
    if (this.filterDebtType) {
      list = list.filter(i => i.debt_type === this.filterDebtType)
    }
    if (!this.sortField) return list
    const dir = this.sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      switch (this.sortField) {
        case "name":
          return ((a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1) * dir
        case "debt_type":
          return ((this._debtTypeLabel(a.debt_type)).toLowerCase() < (this._debtTypeLabel(b.debt_type)).toLowerCase() ? -1 : 1) * dir
        case "original_principal":
          return (parseFloat(a.original_principal || 0) - parseFloat(b.original_principal || 0)) * dir
        case "current_principal":
          return (parseFloat(a.ledger_balance || a.current_principal || 0) - parseFloat(b.ledger_balance || b.current_principal || 0)) * dir
        case "status":
          return ((a.status || "").toLowerCase() < (b.status || "").toLowerCase() ? -1 : 1) * dir
        case "in_net_worth":
          return ((a.include_in_net_worth ? 1 : 0) - (b.include_in_net_worth ? 1 : 0)) * dir
        default:
          return 0
      }
    })
    return list
  }

  _updateSortIcons() {
    this.element.querySelectorAll("[data-sort-icon]").forEach(el => {
      const field = el.dataset.sortIcon
      if (field === this.sortField) {
        el.textContent = this.sortDir === "asc" ? "▲" : "▼"
      } else {
        el.textContent = ""
      }
    })
  }

  // ─── Filtering ──────────────────────────────────────────
  filterByDebtType() {
    this.filterDebtType = this.debtTypeFilterTarget.value
    this.renderTable()
  }

  _rebuildFilterDropdown() {
    const dd = this.debtTypeFilterTarget
    const current = dd.value
    dd.innerHTML = `<option value="">All Types</option>`
    const typesInUse = [...new Set(this.instruments.map(i => i.debt_type).filter(Boolean))].sort()
    for (const dt of typesInUse) {
      dd.innerHTML += `<option value="${escapeHtml(dt)}">${escapeHtml(this._debtTypeLabel(dt))}</option>`
    }
    dd.value = current
  }

  // ─── Table Rendering ───────────────────────────────────
  renderTable() {
    const sorted = this._getSorted()
    if (sorted.length === 0) {
      const msg = this.instruments.length === 0
        ? "No debts or loans yet. Click <strong>Add Debt / Loan</strong> to get started."
        : "No items match the selected filter."
      this.tableBodyTarget.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">${msg}</td></tr>`
    } else {
      this.tableBodyTarget.innerHTML = sorted.map(i => this._renderRow(i)).join("")
    }
    this._updateTotal(sorted)
    this._updateSortIcons()
  }

  _renderRow(i) {
    const op = this._fmt(i.original_principal)
    const bal = this._fmt(i.ledger_balance != null ? i.ledger_balance : i.current_principal)
    const debtLabel = i.debt_type ? escapeHtml(this._debtTypeLabel(i.debt_type)) : ""
    const nwToggle = this._renderNetWorthToggle(i.include_in_net_worth, i.id)
    const progress = this._renderProgressBar(i.progress_percent || 0)
    const lastAct = this._renderLastActivity(i.last_activity)
    const statusBadge = this._renderStatusBadge(i.status)

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-4 text-sm font-semibold whitespace-nowrap"><a href="/financing/instruments/${i.id}" class="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 hover:underline">${escapeHtml(i.name)}</a></td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">${debtLabel}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${op}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${bal}</td>
      <td class="px-6 py-4">${progress}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">${lastAct}</td>
      <td class="px-6 py-4 text-center">${statusBadge}</td>
      <td class="px-6 py-4 text-center">${nwToggle}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end space-x-2">
          <button type="button" data-id="${i.id}" data-action="click->financing-debts-loans#startQuickPayment"
                  class="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" title="Record Payment">Pay</button>
          <button type="button" data-id="${i.id}" data-action="click->financing-debts-loans#startEditing"
                  class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">Edit</button>
          <button type="button" data-id="${i.id}" data-action="click->financing-debts-loans#confirmDelete"
                  class="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
        </div>
      </td>
    </tr>`
  }

  _renderProgressBar(pct) {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0))
    const color = p >= 100 ? "bg-green-500" : p >= 50 ? "bg-brand-500" : "bg-amber-500"
    return `<div class="flex items-center space-x-2 min-w-[100px]">
      <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div class="${color} h-2 rounded-full" style="width: ${p}%"></div>
      </div>
      <span class="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right">${p.toFixed(0)}%</span>
    </div>`
  }

  _renderLastActivity(activity) {
    if (!activity) return `<span class="text-xs text-gray-400">—</span>`
    const date = activity.date || ""
    const type = (activity.type || "").toLowerCase()
    const amt = this._fmt(Math.abs(activity.amount || 0))
    return `<span class="text-[11px]">${escapeHtml(date)} · ${escapeHtml(type)} · ${amt}</span>`
  }

  _renderStatusBadge(status) {
    if (status === "Paid Off") {
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid Off</span>`
    }
    if (status === "Active") {
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Active</span>`
    }
    if (status === "Inactive") {
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Inactive</span>`
    }
    return ""
  }

  _updateTotal(sorted) {
    if (!this.hasTotalTarget) return
    const list = sorted || this._getSorted()
    const totalBal = list.reduce((s, i) => s + parseFloat(i.ledger_balance || i.current_principal || 0), 0)
    this.totalTarget.textContent = `${list.length} item${list.length === 1 ? "" : "s"} · ${this._fmt(totalBal)} outstanding`
  }

  // ─── Net Worth Toggle ──────────────────────────────────
  _renderNetWorthToggle(isOn, instrumentId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
    const translate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="nw-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg}"
      data-checked="${isOn}" data-id="${instrumentId || ""}"
      data-action="click->financing-debts-loans#toggleNetWorth"
      role="switch" aria-checked="${isOn}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${translate}"></span>
    </button>`
  }

  async toggleNetWorth(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn
    const id = Number(btn.dataset.id)

    btn.dataset.checked = String(nowOn)
    btn.classList.toggle("bg-brand-600", nowOn)
    btn.classList.toggle("bg-gray-300", !nowOn)
    btn.classList.toggle("dark:bg-gray-600", !nowOn)
    const knob = btn.querySelector("span")
    knob.classList.toggle("translate-x-7", nowOn)
    knob.classList.toggle("translate-x-1", !nowOn)

    if (id && this.state === "idle") {
      try {
        const res = await fetch(`${this.apiUrlValue}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
          body: JSON.stringify({ financing_instrument: { include_in_net_worth: nowOn } })
        })
        if (res.ok) {
          const updated = await res.json()
          const idx = this.instruments.findIndex(i => i.id === id)
          if (idx >= 0) this.instruments[idx] = updated
          this._updateTotal()
        }
      } catch (e) { /* rollback on next render */ }
    }
  }

  // ─── Add Modal ─────────────────────────────────────────
  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"
    this.addButtonTarget.classList.add("opacity-50", "pointer-events-none")
    this.modalTitleTarget.textContent = "Add Debt / Loan"
    this._clearModal()
    this._populateDropdowns()
    this.modalPaymentFrequencyTarget.value = "MONTHLY"
    this.modalNetWorthTarget.innerHTML = this._renderNetWorthToggle(true)
    this.instrumentModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const inst = this.instruments.find(i => i.id === id)
    if (!inst) return

    this.state = "editing"
    this.editingId = id
    this.addButtonTarget.classList.add("opacity-50", "pointer-events-none")
    this.modalTitleTarget.textContent = "Edit Debt / Loan"
    this._populateDropdowns()

    this.modalNameTarget.value = inst.name || ""
    this.modalInstrumentTypeTarget.value = inst.instrument_type || ""
    this.modalDebtTypeTarget.value = inst.debt_type || ""
    this.modalSubtypeTarget.value = inst.instrument_subtype || ""
    this.modalOriginalPrincipalTarget.value = inst.original_principal || ""
    this.modalCurrentPrincipalTarget.value = inst.current_principal || ""
    this.modalInterestRateTarget.value = inst.interest_rate != null ? inst.interest_rate : ""
    this.modalTermMonthsTarget.value = inst.term_months || ""
    this.modalStartDateTarget.value = inst.start_date || ""
    this.modalMaturityDateTarget.value = inst.maturity_date || ""
    this.modalPaymentFrequencyTarget.value = inst.payment_frequency || "MONTHLY"
    this.modalMonthlyPaymentTarget.value = inst.monthly_payment || ""
    this.modalLenderOrBorrowerTarget.value = inst.lender_or_borrower || ""
    this.modalDescriptionTarget.value = inst.description || ""
    this.modalNotesTarget.value = inst.notes || ""
    this.modalNetWorthTarget.innerHTML = this._renderNetWorthToggle(inst.include_in_net_worth)

    this.instrumentModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  cancelModal() {
    this.instrumentModalTarget.classList.add("hidden")
    this.state = "idle"
    this.editingId = null
    this.addButtonTarget.classList.remove("opacity-50", "pointer-events-none")
  }

  saveModal() {
    if (this.state === "adding") this._saveNew()
    else if (this.state === "editing") this._saveEdit()
  }

  async _saveNew() {
    const data = this._getModalData()
    if (!data) return

    try {
      const res = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ financing_instrument: data })
      })
      if (res.ok || res.status === 201) {
        const created = await res.json()
        this.instruments.push(created)
        this.cancelModal()
        this._rebuildFilterDropdown()
        this.renderTable()
      } else {
        const err = await res.json().catch(() => ({}))
        this._showModalError(err.errors ? err.errors.join(", ") : "Save failed")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  async _saveEdit() {
    const data = this._getModalData()
    if (!data) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ financing_instrument: data })
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = this.instruments.findIndex(i => i.id === this.editingId)
        if (idx >= 0) this.instruments[idx] = updated
        this.cancelModal()
        this._rebuildFilterDropdown()
        this.renderTable()
      } else {
        const err = await res.json().catch(() => ({}))
        this._showModalError(err.errors ? err.errors.join(", ") : "Save failed")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  _getModalData() {
    const name = this.modalNameTarget.value.trim()
    const instrument_type = this.modalInstrumentTypeTarget.value
    const instrument_subtype = this.modalSubtypeTarget.value || null
    const debt_type = this.modalDebtTypeTarget.value || null
    const original_principal = parseFloat(this.modalOriginalPrincipalTarget.value)
    const current_principal = this.modalCurrentPrincipalTarget.value ? parseFloat(this.modalCurrentPrincipalTarget.value) : null
    const interest_rate = parseFloat(this.modalInterestRateTarget.value)
    const term_months = parseInt(this.modalTermMonthsTarget.value, 10)
    const start_date = this.modalStartDateTarget.value
    const maturity_date = this.modalMaturityDateTarget.value || null
    const payment_frequency = this.modalPaymentFrequencyTarget.value || "MONTHLY"
    const monthly_payment = this.modalMonthlyPaymentTarget.value ? parseFloat(this.modalMonthlyPaymentTarget.value) : null
    const lender_or_borrower = this.modalLenderOrBorrowerTarget.value.trim() || null
    const description = this.modalDescriptionTarget.value.trim() || null
    const notes = this.modalNotesTarget.value.trim() || null
    const toggle = this.modalNetWorthTarget.querySelector(".nw-toggle")
    const include_in_net_worth = toggle?.dataset.checked === "true"

    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return null }
    if (!instrument_type) { this._showModalError("Direction is required"); this.modalInstrumentTypeTarget.focus(); return null }
    if (isNaN(original_principal) || original_principal <= 0) { this._showModalError("Original Principal must be greater than 0"); this.modalOriginalPrincipalTarget.focus(); return null }
    if (isNaN(interest_rate) || interest_rate < 0) { this._showModalError("Interest Rate must be 0 or greater"); this.modalInterestRateTarget.focus(); return null }
    if (isNaN(term_months) || term_months <= 0) { this._showModalError("Term must be greater than 0 months"); this.modalTermMonthsTarget.focus(); return null }
    if (!start_date) { this._showModalError("Start Date is required"); this.modalStartDateTarget.focus(); return null }

    return {
      name, instrument_type, instrument_subtype, debt_type,
      original_principal, current_principal, interest_rate, term_months,
      start_date, maturity_date, payment_frequency, monthly_payment,
      lender_or_borrower, description, notes, include_in_net_worth
    }
  }

  _clearModal() {
    this.modalNameTarget.value = ""
    this.modalInstrumentTypeTarget.value = ""
    this.modalDebtTypeTarget.value = ""
    this.modalSubtypeTarget.value = ""
    this.modalOriginalPrincipalTarget.value = ""
    this.modalCurrentPrincipalTarget.value = ""
    this.modalInterestRateTarget.value = ""
    this.modalTermMonthsTarget.value = ""
    this.modalStartDateTarget.value = ""
    this.modalMaturityDateTarget.value = ""
    this.modalPaymentFrequencyTarget.value = "MONTHLY"
    this.modalMonthlyPaymentTarget.value = ""
    this.modalLenderOrBorrowerTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this.modalNotesTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalErrorTarget.textContent = ""
  }

  _showModalError(msg) {
    this.modalErrorTarget.textContent = msg
    this.modalErrorTarget.classList.remove("hidden")
  }

  _populateDropdowns() {
    // Instrument Type
    const typeDD = this.modalInstrumentTypeTarget
    const typeVal = typeDD.value
    typeDD.innerHTML = `<option value="">Select direction...</option>`
    for (const t of INSTRUMENT_TYPES) {
      typeDD.innerHTML += `<option value="${t.value}">${escapeHtml(t.label)}</option>`
    }
    typeDD.value = typeVal

    // Debt Type
    const dtDD = this.modalDebtTypeTarget
    const dtVal = dtDD.value
    dtDD.innerHTML = `<option value="">Select type...</option>`
    for (const dt of DEBT_TYPES) {
      dtDD.innerHTML += `<option value="${dt.value}">${escapeHtml(dt.label)}</option>`
    }
    dtDD.value = dtVal

    // Subtype
    const subDD = this.modalSubtypeTarget
    const subVal = subDD.value
    subDD.innerHTML = `<option value="">Select subtype...</option>`
    for (const s of INSTRUMENT_SUBTYPES) {
      subDD.innerHTML += `<option value="${s.value}">${escapeHtml(s.label)}</option>`
    }
    subDD.value = subVal

    // Payment Frequency
    const freqDD = this.modalPaymentFrequencyTarget
    const freqVal = freqDD.value
    freqDD.innerHTML = ``
    for (const f of PAYMENT_FREQUENCIES) {
      freqDD.innerHTML += `<option value="${f.value}">${escapeHtml(f.label)}</option>`
    }
    freqDD.value = freqVal || "MONTHLY"
  }

  // ─── Delete ─────────────────────────────────────────────
  confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const inst = this.instruments.find(i => i.id === id)
    if (!inst) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = inst.name
    this.deleteModalTarget.classList.remove("hidden")
  }

  cancelDelete() {
    this.deleteModalTarget.classList.add("hidden")
    this.deletingId = null
  }

  async executeDelete() {
    this.deleteModalTarget.classList.add("hidden")
    try {
      const res = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (res.ok || res.status === 204) {
        this.instruments = this.instruments.filter(i => i.id !== this.deletingId)
        this.deletingId = null
        this._rebuildFilterDropdown()
        this.renderTable()
      } else if (res.status === 409) {
        const err = await res.json().catch(() => ({}))
        this.deletingId = null
        alert(err.errors ? err.errors.join(", ") : "Cannot delete this item.")
      }
    } catch (e) {
      this.deletingId = null
    }
  }

  // ─── Quick Payment ─────────────────────────────────────
  startQuickPayment(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const inst = this.instruments.find(i => i.id === id)
    if (!inst) return

    this.quickPaymentId = id
    this.quickPaymentNameTarget.textContent = inst.name
    this.quickPaymentAmountTarget.value = ""
    this.quickPaymentDateTarget.value = new Date().toISOString().slice(0, 10)
    this.quickPaymentNotesTarget.value = ""
    this.quickPaymentErrorTarget.classList.add("hidden")
    this.quickPaymentModalTarget.classList.remove("hidden")
    setTimeout(() => this.quickPaymentAmountTarget.focus(), 50)
  }

  cancelQuickPayment() {
    this.quickPaymentModalTarget.classList.add("hidden")
    this.quickPaymentId = null
  }

  async saveQuickPayment() {
    const amount = parseFloat(this.quickPaymentAmountTarget.value)
    const date = this.quickPaymentDateTarget.value
    const notes = this.quickPaymentNotesTarget.value.trim()

    if (isNaN(amount) || amount <= 0) {
      this.quickPaymentErrorTarget.textContent = "Amount must be greater than 0"
      this.quickPaymentErrorTarget.classList.remove("hidden")
      return
    }
    if (!date) {
      this.quickPaymentErrorTarget.textContent = "Date is required"
      this.quickPaymentErrorTarget.classList.remove("hidden")
      return
    }

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.quickPaymentId}/financing_payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({
          financing_payment: {
            total_amount: amount,
            payment_date: date,
            notes: notes || null
          }
        })
      })
      if (res.ok || res.status === 201) {
        this.cancelQuickPayment()
        await this.fetchAll()
      } else {
        const err = await res.json().catch(() => ({}))
        this.quickPaymentErrorTarget.textContent = err.errors ? err.errors.join(", ") : "Payment failed"
        this.quickPaymentErrorTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.quickPaymentErrorTarget.textContent = "Network error"
      this.quickPaymentErrorTarget.classList.remove("hidden")
    }
  }

  // ─── Helpers ────────────────────────────────────────────
  _fmt(val) {
    const num = parseFloat(val || 0)
    return num.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }

  _debtTypeLabel(value) {
    if (!value) return ""
    const found = DEBT_TYPES.find(dt => dt.value === value)
    return found ? found.label : value.replace(/_/g, " ")
  }
}
