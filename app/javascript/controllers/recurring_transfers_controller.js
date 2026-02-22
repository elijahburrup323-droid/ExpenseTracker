import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton",
    "entryModal", "modalTitle", "modalFrom", "modalTo", "modalAmount",
    "modalFrequency", "modalNextDate", "modalMemo", "modalError",
    "modalFromBucketRow", "modalFromBucket", "modalToBucketRow", "modalToBucket",
    "deleteModal"
  ]
  static values = { apiUrl: String, accountsUrl: String, frequenciesUrl: String, bucketsUrl: String, csrfToken: String }

  connect() {
    this.recurrings = []
    this.accounts = []
    this.frequencies = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.fromBuckets = []
    this.toBuckets = []
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const [recRes, accRes, freqRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.frequenciesUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (recRes.ok) this.recurrings = await recRes.json()
      if (accRes.ok) this.accounts = await accRes.json()
      if (freqRes.ok) {
        const allFreqs = await freqRes.json()
        this.frequencies = allFreqs.filter(f => f.use_flag)
      }
    } catch (e) {
      // silently fail
    }
    this.renderTable()
  }

  // --- Modal Operations ---

  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"

    this.modalTitleTarget.textContent = "Add Recurring Transfer"
    this._rebuildDropdowns()
    this.modalAmountTarget.value = ""
    this.modalNextDateTarget.value = new Date().toISOString().split("T")[0]
    this.modalMemoTarget.value = ""
    this._resetBucketFields()
    this.modalErrorTarget.classList.add("hidden")

    this.entryModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalFromTarget.focus(), 50)
  }

  async startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const rec = this.recurrings.find(r => r.id === id)
    if (!rec) return

    this.state = "editing"
    this.editingId = id

    this.modalTitleTarget.textContent = "Edit Recurring Transfer"
    this._rebuildDropdowns()
    this.modalFromTarget.value = String(rec.from_account_id || "")
    this.modalToTarget.value = String(rec.to_account_id || "")
    this.modalAmountTarget.value = parseFloat(rec.amount) || ""
    this.modalFrequencyTarget.value = String(rec.frequency_master_id || "")
    this.modalNextDateTarget.value = rec.next_date || ""
    this.modalMemoTarget.value = rec.memo || ""
    this._resetBucketFields()
    this.modalErrorTarget.classList.add("hidden")

    this.entryModalTarget.classList.remove("hidden")

    // Fetch and pre-populate bucket dropdowns
    if (rec.from_account_id) {
      await this._fetchBucketsFor(rec.from_account_id, "from")
      if (rec.from_bucket_id && this.hasModalFromBucketTarget) {
        this.modalFromBucketTarget.value = String(rec.from_bucket_id)
      }
    }
    if (rec.to_account_id) {
      await this._fetchBucketsFor(rec.to_account_id, "to")
      if (rec.to_bucket_id && this.hasModalToBucketTarget) {
        this.modalToBucketTarget.value = String(rec.to_bucket_id)
      }
    }

    setTimeout(() => this.modalFromTarget.focus(), 50)
  }

  cancelModal() {
    this.entryModalTarget.classList.add("hidden")
    this.state = "idle"
    this.editingId = null
  }

  saveModal() {
    if (this.state === "adding") this.saveNew()
    else if (this.state === "editing") this.saveEdit()
  }

  async saveNew() {
    const payload = this._getModalPayload()
    if (!payload) return

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ recurring_transfer: { ...payload, use_flag: true } })
      })

      if (response.ok) {
        this.recurrings.push(await response.json())
        this.cancelModal()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  async saveEdit() {
    const payload = this._getModalPayload()
    if (!payload) return

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ recurring_transfer: payload })
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.recurrings.findIndex(r => r.id === this.editingId)
        if (idx !== -1) this.recurrings[idx] = updated
        this.cancelModal()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  // --- Delete ---

  confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const rec = this.recurrings.find(r => r.id === id)
    if (!rec) return

    this.deletingId = id
    this.deleteModalTarget.classList.remove("hidden")
    this.addButtonTarget.disabled = true
  }

  cancelDelete() {
    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  async executeDelete() {
    try {
      const response = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (response.ok || response.status === 204) {
        this.recurrings = this.recurrings.filter(r => r.id !== this.deletingId)
        this.renderTable()
      }
    } catch (e) {}

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Use Toggle ---

  _renderUseToggle(isOn, recId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    const dataId = recId ? `data-id="${recId}"` : ""
    return `<button type="button"
      class="use-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isOn}" ${dataId}
      data-action="click->recurring-transfers#toggleUse"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Active: Yes' : 'Active: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleUse(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Active: Yes" : "Active: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-brand-600", nowOn ? "bg-brand-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const recId = btn.dataset.id
    if (recId && this.state === "idle") {
      try {
        const response = await fetch(`${this.apiUrlValue}/${recId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
          body: JSON.stringify({ recurring_transfer: { use_flag: nowOn } })
        })
        if (response.ok) {
          const updated = await response.json()
          const idx = this.recurrings.findIndex(r => r.id === Number(recId))
          if (idx !== -1) this.recurrings[idx] = updated
        }
      } catch (e) {
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "Active: Yes" : "Active: No"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-brand-600", wasOn ? "bg-brand-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
  }

  // --- Bucket Helpers ---

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
      buckets.map(b => `<option value="${b.id}">${this._esc(b.name)} ($${parseFloat(b.current_balance).toFixed(2)})</option>`).join("")
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
  }

  onFromAccountChange(event) {
    const val = event.target.value
    if (val) { this._fetchBucketsFor(Number(val), "from") }
    else { this._hideBucketRow("from"); this.fromBuckets = [] }
  }

  onToAccountChange(event) {
    const val = event.target.value
    if (val) { this._fetchBucketsFor(Number(val), "to") }
    else { this._hideBucketRow("to"); this.toBuckets = [] }
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter") { event.preventDefault(); this.saveModal() }
    else if (event.key === "Escape") { event.preventDefault(); this.cancelModal() }
  }

  // --- Rendering ---

  renderTable() {
    if (this.recurrings.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No recurring transfers yet. Click "Add Recurring Transfer" to create one.</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = this.recurrings.map(rec => this._renderDisplayRow(rec)).join("")
  }

  _formatAmount(amount) {
    const num = parseFloat(amount)
    if (!num && num !== 0) return "&mdash;"
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  _renderDisplayRow(rec) {
    const fromBucketLabel = rec.from_bucket_name ? `<span class="block text-xs text-gray-400">${this._esc(rec.from_bucket_name)}</span>` : ""
    const toBucketLabel = rec.to_bucket_name ? `<span class="block text-xs text-gray-400">${this._esc(rec.to_bucket_name)}</span>` : ""

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-white">
        <div>${this._esc(rec.from_account_name || "\u2014")}</div>${fromBucketLabel}
      </td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-white">
        <div>${this._esc(rec.to_account_name || "\u2014")}</div>${toBucketLabel}
      </td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums font-mono">${this._formatAmount(rec.amount)}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.frequency_name || "")}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${rec.next_date || ""}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[140px] truncate">${this._esc(rec.memo || "")}</td>
      <td class="px-4 py-4 text-center">${this._renderUseToggle(rec.use_flag, rec.id)}</td>
      <td class="px-4 py-4 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${rec.id}"
                data-action="click->recurring-transfers#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${rec.id}"
                data-action="click->recurring-transfers#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  // --- Modal Helpers ---

  _rebuildDropdowns() {
    const activeAccounts = this.accounts.filter(a => !a.deleted_at)
    let accHtml = `<option value="">Select account...</option>`
    accHtml += activeAccounts.map(a => `<option value="${a.id}">${this._esc(a.name)}</option>`).join("")
    this.modalFromTarget.innerHTML = accHtml
    this.modalToTarget.innerHTML = accHtml

    let freqHtml = `<option value="">Select frequency...</option>`
    freqHtml += this.frequencies.map(f => `<option value="${f.frequency_master_id}">${this._esc(f.name)}</option>`).join("")
    this.modalFrequencyTarget.innerHTML = freqHtml
  }

  _getModalPayload() {
    const from_account_id = this.modalFromTarget.value
    const to_account_id = this.modalToTarget.value
    const amount = this.modalAmountTarget.value.trim() || "0"
    const frequency_master_id = this.modalFrequencyTarget.value
    const next_date = this.modalNextDateTarget.value
    const memo = this.modalMemoTarget.value.trim()
    const from_bucket_id = this.hasModalFromBucketTarget ? this.modalFromBucketTarget.value || null : null
    const to_bucket_id = this.hasModalToBucketTarget ? this.modalToBucketTarget.value || null : null

    if (!from_account_id) { this._showModalError("From Account is required"); return null }
    if (!to_account_id) { this._showModalError("To Account is required"); return null }
    if (from_account_id === to_account_id) {
      if (!from_bucket_id || !to_bucket_id) { this._showModalError("Select both buckets to move funds within the same account."); return null }
      if (from_bucket_id === to_bucket_id) { this._showModalError("From Bucket and To Bucket cannot be the same."); return null }
    }
    if (!parseFloat(amount) || parseFloat(amount) <= 0) { this._showModalError("Amount must be greater than $0.00"); return null }
    if (!frequency_master_id) { this._showModalError("Frequency is required"); return null }
    if (!next_date) { this._showModalError("Next Date is required"); return null }

    return { from_account_id, to_account_id, from_bucket_id, to_bucket_id, amount, frequency_master_id, next_date, memo }
  }

  _showModalError(message) {
    this.modalErrorTarget.classList.remove("hidden")
    this.modalErrorTarget.querySelector("p").textContent = message
  }

  // --- Helpers ---

  _esc(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
