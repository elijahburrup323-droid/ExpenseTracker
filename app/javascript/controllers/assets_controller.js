import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "total", "typeFilter",
    "assetModal", "modalTitle", "modalName", "modalType",
    "modalPurchaseDate", "modalPurchasePrice", "modalCurrentValue",
    "modalNetWorth", "modalNotes", "modalError",
    "deleteModal", "deleteModalName",
    "blockedDeleteModal"
  ]

  static values = {
    apiUrl: String,
    typesUrl: String,
    csrfToken: String
  }

  connect() {
    this.assets = []
    this.assetTypes = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.sortField = "name"
    this.sortDir = "asc"
    this.filterTypeId = ""
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const [assetsRes, typesRes] = await Promise.all([
        fetch(this.apiUrlValue, { credentials: "same-origin" }),
        fetch(this.typesUrlValue, { credentials: "same-origin" })
      ])
      this.assets = await assetsRes.json()
      this.assetTypes = await typesRes.json()
      this._rebuildTypeDropdown()
      this._rebuildFilterDropdown()
      this.renderTable()
    } catch (e) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-red-500">Failed to load assets.</td></tr>`
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

  _getSortedAssets() {
    let list = [...this.assets]
    if (this.filterTypeId) {
      list = list.filter(a => String(a.asset_type_id) === this.filterTypeId)
    }
    if (!this.sortField) return list
    const dir = this.sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      switch (this.sortField) {
        case "name":
          return ((a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1) * dir
        case "type":
          return ((a.asset_type_name || "").toLowerCase() < (b.asset_type_name || "").toLowerCase() ? -1 : 1) * dir
        case "purchase_price":
          return (parseFloat(a.purchase_price || 0) - parseFloat(b.purchase_price || 0)) * dir
        case "current_value":
          return (parseFloat(a.current_value || 0) - parseFloat(b.current_value || 0)) * dir
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
    this.filterTypeId = this.typeFilterTarget.value
    this.renderTable()
  }

  _rebuildFilterDropdown() {
    const dd = this.typeFilterTarget
    const current = dd.value
    dd.innerHTML = `<option value="">All Types</option>`
    for (const t of this.assetTypes) {
      dd.innerHTML += `<option value="${t.id}">${escapeHtml(t.name)}</option>`
    }
    dd.value = current
  }

  // ─── Table Rendering ─────────────────────────────────────
  renderTable() {
    const sorted = this._getSortedAssets()
    if (sorted.length === 0) {
      const msg = this.assets.length === 0
        ? "No assets yet. Click <strong>Add Asset</strong> to get started."
        : "No assets match the selected filter."
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">${msg}</td></tr>`
    } else {
      this.tableBodyTarget.innerHTML = sorted.map(a => this._renderRow(a)).join("")
    }
    this._updateTotal()
    this._updateSortIcons()
  }

  _renderRow(a) {
    const pp = a.purchase_price != null ? this._fmt(a.purchase_price) : "—"
    const cv = this._fmt(a.current_value)
    const nwToggle = this._renderNetWorthToggle(a.include_in_net_worth, a.id)
    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(a.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(a.asset_type_name || "")}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${pp}</td>
      <td class="px-6 py-4 text-sm text-green-600 dark:text-green-400 text-right tabular-nums font-semibold">${cv}</td>
      <td class="px-6 py-4 text-center">${nwToggle}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end space-x-2">
          <button type="button" data-id="${a.id}" data-action="click->assets#startEditing"
                  class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">Edit</button>
          <button type="button" data-id="${a.id}" data-action="click->assets#confirmDelete"
                  class="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
        </div>
      </td>
    </tr>`
  }

  _updateTotal() {
    if (!this.hasTotalTarget) return
    const filtered = this._getSortedAssets()
    const included = filtered.filter(a => a.include_in_net_worth)
    const total = included.reduce((s, a) => s + parseFloat(a.current_value || 0), 0)
    this.totalTarget.textContent = `${filtered.length} asset${filtered.length === 1 ? "" : "s"} · ${this._fmt(total)} in net worth`
  }

  // ─── Net Worth Toggle ────────────────────────────────────
  _renderNetWorthToggle(isOn, assetId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
    const translate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="nw-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg}"
      data-checked="${isOn}" data-id="${assetId || ""}"
      data-action="click->assets#toggleNetWorth"
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
          body: JSON.stringify({ asset: { include_in_net_worth: nowOn } })
        })
        if (res.ok) {
          const updated = await res.json()
          const idx = this.assets.findIndex(a => a.id === id)
          if (idx >= 0) this.assets[idx] = updated
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
    this.modalTitleTarget.textContent = "Add Asset"
    this._clearModal()
    this._rebuildTypeDropdown()
    this.modalNetWorthTarget.innerHTML = this._renderNetWorthToggle(true)
    this.assetModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const asset = this.assets.find(a => a.id === id)
    if (!asset) return

    this.state = "editing"
    this.editingId = id
    this.addButtonTarget.classList.add("opacity-50", "pointer-events-none")
    this.modalTitleTarget.textContent = "Edit Asset"
    this._rebuildTypeDropdown()

    this.modalNameTarget.value = asset.name || ""
    this.modalTypeTarget.value = String(asset.asset_type_id || "")
    this.modalPurchaseDateTarget.value = asset.purchase_date || ""
    this.modalPurchasePriceTarget.value = asset.purchase_price != null ? asset.purchase_price : ""
    this.modalCurrentValueTarget.value = asset.current_value != null ? asset.current_value : ""
    this.modalNotesTarget.value = asset.notes || ""
    this.modalNetWorthTarget.innerHTML = this._renderNetWorthToggle(asset.include_in_net_worth)

    this.assetModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  cancelModal() {
    this.assetModalTarget.classList.add("hidden")
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
        body: JSON.stringify({ asset: data })
      })
      if (res.ok || res.status === 201) {
        const created = await res.json()
        this.assets.push(created)
        this.cancelModal()
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
        body: JSON.stringify({ asset: data })
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = this.assets.findIndex(a => a.id === this.editingId)
        if (idx >= 0) this.assets[idx] = updated
        this.cancelModal()
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
    const asset_type_id = this.modalTypeTarget.value
    const current_value = this.modalCurrentValueTarget.value.trim()
    const purchase_price = this.modalPurchasePriceTarget.value.trim()
    const purchase_date = this.modalPurchaseDateTarget.value || null
    const notes = this.modalNotesTarget.value.trim() || null
    const toggle = this.modalNetWorthTarget.querySelector(".nw-toggle")
    const include_in_net_worth = toggle?.dataset.checked === "true"

    if (!name) { this._showModalError("Asset Name is required"); this.modalNameTarget.focus(); return null }
    if (!asset_type_id) { this._showModalError("Type is required"); this.modalTypeTarget.focus(); return null }
    if (!current_value || parseFloat(current_value) < 0) { this._showModalError("Current Value must be >= 0"); this.modalCurrentValueTarget.focus(); return null }
    if (purchase_price && parseFloat(purchase_price) < 0) { this._showModalError("Purchase Price must be >= 0"); this.modalPurchasePriceTarget.focus(); return null }

    return {
      name,
      asset_type_id: Number(asset_type_id),
      current_value: parseFloat(current_value),
      purchase_price: purchase_price ? parseFloat(purchase_price) : null,
      purchase_date,
      include_in_net_worth,
      notes
    }
  }

  _clearModal() {
    this.modalNameTarget.value = ""
    this.modalTypeTarget.value = ""
    this.modalPurchaseDateTarget.value = ""
    this.modalPurchasePriceTarget.value = ""
    this.modalCurrentValueTarget.value = ""
    this.modalNotesTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalErrorTarget.textContent = ""
  }

  _showModalError(msg) {
    this.modalErrorTarget.textContent = msg
    this.modalErrorTarget.classList.remove("hidden")
  }

  _rebuildTypeDropdown() {
    const dd = this.modalTypeTarget
    const current = dd.value
    dd.innerHTML = `<option value="">Select type...</option>`
    for (const t of this.assetTypes) {
      dd.innerHTML += `<option value="${t.id}">${escapeHtml(t.name)}</option>`
    }
    dd.value = current
  }

  // ─── Delete ──────────────────────────────────────────────
  confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const asset = this.assets.find(a => a.id === id)
    if (!asset) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = asset.name
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
        this.assets = this.assets.filter(a => a.id !== this.deletingId)
        this.deletingId = null
        this.renderTable()
      } else if (res.status === 409) {
        this.deletingId = null
        this.blockedDeleteModalTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.deletingId = null
    }
  }

  closeBlockedDelete() {
    this.blockedDeleteModalTarget.classList.add("hidden")
  }

  // ─── Helpers ─────────────────────────────────────────────
  _fmt(val) {
    const num = parseFloat(val || 0)
    return num.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }
}
