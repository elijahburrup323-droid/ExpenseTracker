import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

const ACCOUNT_TYPES = [
  "Brokerage", "IRA", "Roth IRA", "401k", "403b",
  "529 Plan", "HSA", "SEP IRA", "Trust", "Other"
]

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "total", "typeFilter",
    "accountModal", "modalTitle", "modalName", "modalType",
    "modalNetWorth", "modalError",
    "deleteModal", "deleteModalName"
  ]

  static values = {
    apiUrl: String,
    csrfToken: String
  }

  connect() {
    this.accounts = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.sortField = "name"
    this.sortDir = "asc"
    this.filterType = ""
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const res = await fetch(this.apiUrlValue, { credentials: "same-origin" })
      this.accounts = await res.json()
      this._rebuildFilterDropdown()
      this.renderTable()
      // Auto-open add modal if ?open=add is in URL
      const params = new URLSearchParams(window.location.search)
      if (params.get("open") === "add") {
        this.startAdding()
        window.history.replaceState({}, "", window.location.pathname)
      }
    } catch (e) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-red-500">Failed to load investment accounts.</td></tr>`
    }
  }

  // ─── Sorting ─────────────────────────────────────────────
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

  _getSortedAccounts() {
    let list = [...this.accounts]
    if (this.filterType) {
      list = list.filter(a => a.account_type === this.filterType)
    }
    if (!this.sortField) return list
    const dir = this.sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      switch (this.sortField) {
        case "name":
          return ((a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1) * dir
        case "account_type":
          return ((a.account_type || "").toLowerCase() < (b.account_type || "").toLowerCase() ? -1 : 1) * dir
        case "market_value":
          return (parseFloat(a.market_value || 0) - parseFloat(b.market_value || 0)) * dir
        case "cost_basis":
          return (parseFloat(a.cost_basis || 0) - parseFloat(b.cost_basis || 0)) * dir
        case "unrealized_gain":
          return (parseFloat(a.unrealized_gain || 0) - parseFloat(b.unrealized_gain || 0)) * dir
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

  // ─── Filtering ───────────────────────────────────────────
  filterByType() {
    this.filterType = this.typeFilterTarget.value
    this.renderTable()
  }

  _rebuildFilterDropdown() {
    const dd = this.typeFilterTarget
    const current = dd.value
    dd.innerHTML = `<option value="">All Types</option>`
    const typesInUse = [...new Set(this.accounts.map(a => a.account_type))].sort()
    for (const t of typesInUse) {
      dd.innerHTML += `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    }
    dd.value = current
  }

  // ─── Table Rendering ─────────────────────────────────────
  renderTable() {
    const sorted = this._getSortedAccounts()
    if (sorted.length === 0) {
      const msg = this.accounts.length === 0
        ? "No investment accounts yet. Click <strong>Add Account</strong> to get started."
        : "No accounts match the selected filter."
      this.tableBodyTarget.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">${msg}</td></tr>`
    } else {
      this.tableBodyTarget.innerHTML = sorted.map(a => this._renderRow(a)).join("")
    }
    this._updateTotal(sorted)
    this._updateSortIcons()
  }

  _renderRow(a) {
    const mv = this._fmt(a.market_value)
    const cb = this._fmt(a.cost_basis)
    const ug = parseFloat(a.unrealized_gain || 0)
    const ugFmt = this._fmt(ug)
    const cbVal = parseFloat(a.cost_basis || 0)
    const pct = cbVal !== 0 ? ((ug / cbVal) * 100).toFixed(1) : "0.0"
    const ugColor = ug >= 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400"
    const nwToggle = this._renderNetWorthToggle(a.include_in_net_worth, a.id)

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(a.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(a.account_type)}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${mv}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${cb}</td>
      <td class="px-6 py-4 text-sm ${ugColor} text-right tabular-nums font-medium">${ugFmt} <span class="text-xs">(${pct}%)</span></td>
      <td class="px-6 py-4 text-center">${nwToggle}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end space-x-2">
          <button type="button" data-id="${a.id}" data-action="click->investment-accounts#startEditing"
                  class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">Edit</button>
          <button type="button" data-id="${a.id}" data-action="click->investment-accounts#confirmDelete"
                  class="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
        </div>
      </td>
    </tr>`
  }

  _updateTotal(sorted) {
    if (!this.hasTotalTarget) return
    const list = sorted || this._getSortedAccounts()
    const totalMv = list.reduce((s, a) => s + parseFloat(a.market_value || 0), 0)
    this.totalTarget.textContent = `${list.length} account${list.length === 1 ? "" : "s"} · ${this._fmt(totalMv)} market value`
  }

  // ─── Net Worth Toggle ────────────────────────────────────
  _renderNetWorthToggle(isOn, accountId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
    const translate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="nw-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg}"
      data-checked="${isOn}" data-id="${accountId || ""}"
      data-action="click->investment-accounts#toggleNetWorth"
      role="switch" aria-checked="${isOn}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${translate}"></span>
    </button>`
  }

  async toggleNetWorth(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn
    const id = Number(btn.dataset.id)

    // Optimistic UI update
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
          body: JSON.stringify({ investment_account: { include_in_net_worth: nowOn } })
        })
        if (res.ok) {
          const updated = await res.json()
          const idx = this.accounts.findIndex(a => a.id === id)
          if (idx >= 0) this.accounts[idx] = updated
          this._updateTotal()
        }
      } catch (e) { /* rollback on next render */ }
    }
  }

  // ─── Add Modal ───────────────────────────────────────────
  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"
    this.addButtonTarget.classList.add("opacity-50", "pointer-events-none")
    this.modalTitleTarget.textContent = "Add Investment Account"
    this._clearModal()
    this._rebuildTypeDropdownModal()
    this.modalNetWorthTarget.innerHTML = this._renderNetWorthToggle(true)
    this.accountModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const account = this.accounts.find(a => a.id === id)
    if (!account) return

    this.state = "editing"
    this.editingId = id
    this.addButtonTarget.classList.add("opacity-50", "pointer-events-none")
    this.modalTitleTarget.textContent = "Edit Investment Account"
    this._rebuildTypeDropdownModal()

    this.modalNameTarget.value = account.name || ""
    this.modalTypeTarget.value = account.account_type || ""
    this.modalNetWorthTarget.innerHTML = this._renderNetWorthToggle(account.include_in_net_worth)

    this.accountModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  cancelModal() {
    this.accountModalTarget.classList.add("hidden")
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
        body: JSON.stringify({ investment_account: data })
      })
      if (res.ok || res.status === 201) {
        const created = await res.json()
        this.accounts.push(created)
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
        body: JSON.stringify({ investment_account: data })
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = this.accounts.findIndex(a => a.id === this.editingId)
        if (idx >= 0) this.accounts[idx] = updated
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
    const account_type = this.modalTypeTarget.value
    const toggle = this.modalNetWorthTarget.querySelector(".nw-toggle")
    const include_in_net_worth = toggle?.dataset.checked === "true"

    if (!name) { this._showModalError("Account Name is required"); this.modalNameTarget.focus(); return null }
    if (!account_type) { this._showModalError("Account Type is required"); this.modalTypeTarget.focus(); return null }

    return { name, account_type, include_in_net_worth }
  }

  _clearModal() {
    this.modalNameTarget.value = ""
    this.modalTypeTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalErrorTarget.textContent = ""
  }

  _showModalError(msg) {
    this.modalErrorTarget.textContent = msg
    this.modalErrorTarget.classList.remove("hidden")
  }

  _rebuildTypeDropdownModal() {
    const dd = this.modalTypeTarget
    const current = dd.value
    dd.innerHTML = `<option value="">Select type...</option>`
    for (const t of ACCOUNT_TYPES) {
      dd.innerHTML += `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    }
    dd.value = current
  }

  // ─── Delete ──────────────────────────────────────────────
  confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const account = this.accounts.find(a => a.id === id)
    if (!account) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = account.name
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
        this.accounts = this.accounts.filter(a => a.id !== this.deletingId)
        this.deletingId = null
        this._rebuildFilterDropdown()
        this.renderTable()
      }
    } catch (e) {
      this.deletingId = null
    }
  }

  // ─── Helpers ─────────────────────────────────────────────
  _fmt(val) {
    const num = parseFloat(val || 0)
    return num.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }
}
