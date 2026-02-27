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
    "tableBody", "addButton", "total", "subtypeFilter",
    "instrumentModal", "modalTitle",
    "modalName", "modalInstrumentType", "modalSubtype",
    "modalOriginalPrincipal", "modalCurrentPrincipal",
    "modalInterestRate", "modalTermMonths", "modalStartDate",
    "modalMaturityDate", "modalPaymentFrequency", "modalMonthlyPayment",
    "modalLenderOrBorrower", "modalDescription", "modalNetWorth",
    "modalNotes", "modalError",
    "deleteModal", "deleteModalName"
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
    this.sortField = "name"
    this.sortDir = "asc"
    this.filterSubtype = ""
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
      this.tableBodyTarget.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-sm text-red-500">Failed to load financing instruments.</td></tr>`
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
    if (this.filterSubtype) {
      list = list.filter(i => i.instrument_subtype === this.filterSubtype)
    }
    if (!this.sortField) return list
    const dir = this.sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      switch (this.sortField) {
        case "name":
          return ((a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1) * dir
        case "instrument_subtype":
          return ((this._subtypeLabel(a.instrument_subtype)).toLowerCase() < (this._subtypeLabel(b.instrument_subtype)).toLowerCase() ? -1 : 1) * dir
        case "instrument_type":
          return ((a.instrument_type || "") < (b.instrument_type || "") ? -1 : 1) * dir
        case "original_principal":
          return (parseFloat(a.original_principal || 0) - parseFloat(b.original_principal || 0)) * dir
        case "current_principal":
          return (parseFloat(a.current_principal || 0) - parseFloat(b.current_principal || 0)) * dir
        case "interest_rate":
          return (parseFloat(a.interest_rate || 0) - parseFloat(b.interest_rate || 0)) * dir
        case "monthly_payment":
          return (parseFloat(a.monthly_payment || 0) - parseFloat(b.monthly_payment || 0)) * dir
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
  filterBySubtype() {
    this.filterSubtype = this.subtypeFilterTarget.value
    this.renderTable()
  }

  _rebuildFilterDropdown() {
    const dd = this.subtypeFilterTarget
    const current = dd.value
    dd.innerHTML = `<option value="">All Types</option>`
    const subtypesInUse = [...new Set(this.instruments.map(i => i.instrument_subtype).filter(Boolean))].sort()
    for (const s of subtypesInUse) {
      dd.innerHTML += `<option value="${escapeHtml(s)}">${escapeHtml(this._subtypeLabel(s))}</option>`
    }
    dd.value = current
  }

  // ─── Table Rendering ───────────────────────────────────
  renderTable() {
    const sorted = this._getSorted()
    if (sorted.length === 0) {
      const msg = this.instruments.length === 0
        ? "No loans or notes yet. Click <strong>Add Loan</strong> to get started."
        : "No instruments match the selected filter."
      this.tableBodyTarget.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">${msg}</td></tr>`
    } else {
      this.tableBodyTarget.innerHTML = sorted.map(i => this._renderRow(i)).join("")
    }
    this._updateTotal(sorted)
    this._updateSortIcons()
  }

  _renderRow(i) {
    const op = this._fmt(i.original_principal)
    const cp = this._fmt(i.current_principal)
    const rate = this._fmtPct(i.interest_rate)
    const pmt = i.monthly_payment ? this._fmt(i.monthly_payment) : "—"
    const badge = this._directionBadge(i.instrument_type)
    const subLabel = i.instrument_subtype ? escapeHtml(this._subtypeLabel(i.instrument_subtype)) : ""
    const nwToggle = this._renderNetWorthToggle(i.include_in_net_worth, i.id)

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-4 text-sm font-semibold whitespace-nowrap"><a href="/financing/instruments/${i.id}" class="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 hover:underline">${escapeHtml(i.name)}</a></td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">${subLabel}</td>
      <td class="px-6 py-4 text-sm whitespace-nowrap">${badge}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${op}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${cp}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${rate}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${pmt}</td>
      <td class="px-6 py-4 text-center">${nwToggle}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end space-x-2">
          <button type="button" data-id="${i.id}" data-action="click->financing-loans-notes#startEditing"
                  class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">Edit</button>
          <button type="button" data-id="${i.id}" data-action="click->financing-loans-notes#confirmDelete"
                  class="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
        </div>
      </td>
    </tr>`
  }

  _updateTotal(sorted) {
    if (!this.hasTotalTarget) return
    const list = sorted || this._getSorted()
    const totalCp = list.reduce((s, i) => s + parseFloat(i.current_principal || 0), 0)
    this.totalTarget.textContent = `${list.length} instrument${list.length === 1 ? "" : "s"} · ${this._fmt(totalCp)} outstanding`
  }

  // ─── Net Worth Toggle ──────────────────────────────────
  _renderNetWorthToggle(isOn, instrumentId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
    const translate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="nw-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg}"
      data-checked="${isOn}" data-id="${instrumentId || ""}"
      data-action="click->financing-loans-notes#toggleNetWorth"
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
    this.modalTitleTarget.textContent = "Add Loan / Note"
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
    this.modalTitleTarget.textContent = "Edit Loan / Note"
    this._populateDropdowns()

    this.modalNameTarget.value = inst.name || ""
    this.modalInstrumentTypeTarget.value = inst.instrument_type || ""
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
    if (!instrument_type) { this._showModalError("Instrument Type is required"); this.modalInstrumentTypeTarget.focus(); return null }
    if (isNaN(original_principal) || original_principal <= 0) { this._showModalError("Original Principal must be greater than 0"); this.modalOriginalPrincipalTarget.focus(); return null }
    if (isNaN(interest_rate) || interest_rate < 0) { this._showModalError("Interest Rate must be 0 or greater"); this.modalInterestRateTarget.focus(); return null }
    if (isNaN(term_months) || term_months <= 0) { this._showModalError("Term must be greater than 0 months"); this.modalTermMonthsTarget.focus(); return null }
    if (!start_date) { this._showModalError("Start Date is required"); this.modalStartDateTarget.focus(); return null }

    return {
      name, instrument_type, instrument_subtype,
      original_principal, current_principal, interest_rate, term_months,
      start_date, maturity_date, payment_frequency, monthly_payment,
      lender_or_borrower, description, notes, include_in_net_worth
    }
  }

  _clearModal() {
    this.modalNameTarget.value = ""
    this.modalInstrumentTypeTarget.value = ""
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

    // Subtype
    const subDD = this.modalSubtypeTarget
    const subVal = subDD.value
    subDD.innerHTML = `<option value="">Select type...</option>`
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
        alert(err.errors ? err.errors.join(", ") : "Cannot delete this instrument.")
      }
    } catch (e) {
      this.deletingId = null
    }
  }

  // ─── Helpers ────────────────────────────────────────────
  _fmt(val) {
    const num = parseFloat(val || 0)
    return num.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }

  _fmtPct(val) {
    const num = parseFloat(val || 0)
    return num.toFixed(2) + "%"
  }

  _subtypeLabel(value) {
    if (!value) return ""
    const found = INSTRUMENT_SUBTYPES.find(s => s.value === value)
    return found ? found.label : value
  }

  _directionBadge(type) {
    if (type === "PAYABLE") {
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Payable</span>`
    }
    if (type === "RECEIVABLE") {
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Receivable</span>`
    }
    return ""
  }
}
