import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "accountFilter",
    "entryModal", "modalTitle", "modalAccount", "modalName", "modalTargetAmt", "modalBalance", "modalBalanceRow", "modalPriority", "modalError",
    "fundModal", "fundFrom", "fundFromBalance", "fundToName", "fundAmount", "fundError",
    "deleteModal", "deleteModalName"
  ]
  static values = { apiUrl: String, accountsUrl: String, csrfToken: String }

  connect() {
    this.buckets = []
    this.accounts = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.fundingId = null
    this.filterAccountId = ""
    this.fetchAll()
  }

  disconnect() {
    if (this._modalEscapeHandler) {
      document.removeEventListener("keydown", this._modalEscapeHandler)
    }
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const [bucketsRes, accountsRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (bucketsRes.ok) this.buckets = await bucketsRes.json()
      if (accountsRes.ok) this.accounts = await accountsRes.json()
    } catch (e) {
      // silently fail
    }
    this._rebuildAccountFilter()
    this.renderTable()
  }

  // --- Account Filter ---

  filterByAccount() {
    this.filterAccountId = this.accountFilterTarget.value
    this.renderTable()
  }

  _rebuildAccountFilter() {
    let html = `<option value="">All Accounts</option>`
    // Only show accounts that have buckets
    const bucketAccountIds = new Set(this.buckets.map(b => b.account_id))
    const accountsWithBuckets = this.accounts.filter(a => bucketAccountIds.has(a.id))
    // Also show all accounts for selection
    html += this.accounts.map(a => `<option value="${a.id}">${this._esc(a.name)}</option>`).join("")
    this.accountFilterTarget.innerHTML = html
    if (this.filterAccountId) {
      this.accountFilterTarget.value = this.filterAccountId
    }
  }

  // --- Modal Operations ---

  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"

    this.modalTitleTarget.textContent = "Add Bucket"
    this._rebuildModalAccountDropdown()
    this.modalNameTarget.value = ""
    this.modalTargetAmtTarget.value = ""
    this.modalBalanceTarget.value = ""
    this.modalPriorityTarget.value = "0"
    this.modalBalanceRowTarget.classList.remove("hidden")
    this.modalErrorTarget.classList.add("hidden")

    // Pre-select filtered account if one is selected
    if (this.filterAccountId) {
      this.modalAccountTarget.value = this.filterAccountId
    }

    this.entryModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const bucket = this.buckets.find(b => b.id === id)
    if (!bucket) return

    this.state = "editing"
    this.editingId = id

    this.modalTitleTarget.textContent = "Edit Bucket"
    this._rebuildModalAccountDropdown()
    this.modalAccountTarget.value = String(bucket.account_id || "")
    this.modalNameTarget.value = bucket.name || ""
    this.modalTargetAmtTarget.value = bucket.target_amount != null ? bucket.target_amount : ""
    this.modalPriorityTarget.value = bucket.priority || 0
    this.modalBalanceRowTarget.classList.add("hidden") // Don't allow balance edit
    this.modalErrorTarget.classList.add("hidden")

    this.entryModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  cancelModal() {
    this.entryModalTarget.classList.add("hidden")
    this.state = "idle"
    this.editingId = null
    this._unregisterModalEscape()
  }

  saveModal() {
    if (this.state === "adding") this.saveNew()
    else if (this.state === "editing") this.saveEdit()
  }

  async saveNew() {
    const account_id = this.modalAccountTarget.value
    const name = this.modalNameTarget.value.trim()
    const target_amount = this.modalTargetAmtTarget.value.trim() || null
    const current_balance = this.modalBalanceTarget.value.trim() || "0"
    const priority = this.modalPriorityTarget.value.trim() || "0"

    if (!account_id) { this._showModalError("Account is required"); return }
    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ bucket: { account_id, name, target_amount, current_balance, priority } })
      })

      if (response.ok) {
        const newBucket = await response.json()
        this.buckets.push(newBucket)
        this.cancelModal()
        this._rebuildAccountFilter()
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
    const account_id = this.modalAccountTarget.value
    const name = this.modalNameTarget.value.trim()
    const target_amount = this.modalTargetAmtTarget.value.trim() || null
    const priority = this.modalPriorityTarget.value.trim() || "0"

    if (!account_id) { this._showModalError("Account is required"); return }
    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return }

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ bucket: { account_id, name, target_amount, priority } })
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.buckets.findIndex(b => b.id === this.editingId)
        if (idx !== -1) this.buckets[idx] = updated
        this.cancelModal()
        this._rebuildAccountFilter()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this._showModalError("Network error")
    }
  }

  // --- Fund / Move Money ---

  openFund(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const bucket = this.buckets.find(b => b.id === id)
    if (!bucket) return

    this.fundingId = id
    this.fundToNameTarget.textContent = bucket.name

    // Populate "from" dropdown with other buckets in same account
    const siblings = this.buckets.filter(b => b.account_id === bucket.account_id && b.id !== id)
    let html = siblings.map(b => `<option value="${b.id}">${this._esc(b.name)} ($${parseFloat(b.current_balance).toFixed(2)})</option>`).join("")
    this.fundFromTarget.innerHTML = html
    this.fundAmountTarget.value = ""
    this.fundErrorTarget.classList.add("hidden")
    this._updateFundFromBalance()

    this.fundModalTarget.classList.remove("hidden")
    this._registerModalEscape()
  }

  _updateFundFromBalance() {
    const fromId = Number(this.fundFromTarget.value)
    const from = this.buckets.find(b => b.id === fromId)
    if (from) {
      this.fundFromBalanceTarget.textContent = `Available: $${parseFloat(from.current_balance).toFixed(2)}`
    } else {
      this.fundFromBalanceTarget.textContent = ""
    }
  }

  cancelFund() {
    this.fundModalTarget.classList.add("hidden")
    this.fundingId = null
    this._unregisterModalEscape()
  }

  async executeFund() {
    const fromBucketId = this.fundFromTarget.value
    const amount = this.fundAmountTarget.value.trim()

    if (!fromBucketId) { this._showFundError("Select a source bucket"); return }
    if (!amount || parseFloat(amount) <= 0) { this._showFundError("Amount must be greater than zero"); return }

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.fundingId}/fund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ from_bucket_id: fromBucketId, amount: amount })
      })

      if (response.ok) {
        const data = await response.json()
        // Update both buckets in local array
        const fromIdx = this.buckets.findIndex(b => b.id === data.from_bucket.id)
        if (fromIdx !== -1) this.buckets[fromIdx] = data.from_bucket
        const toIdx = this.buckets.findIndex(b => b.id === data.to_bucket.id)
        if (toIdx !== -1) this.buckets[toIdx] = data.to_bucket
        this.cancelFund()
        this.renderTable()
      } else {
        const data = await response.json()
        this._showFundError(data.errors?.[0] || "Failed to move money")
      }
    } catch (e) {
      this._showFundError("Network error")
    }
  }

  handleFundKeydown(event) {
    if (event.key === "Enter") { event.preventDefault(); this.executeFund() }
    else if (event.key === "Escape") { event.preventDefault(); this.cancelFund() }
  }

  // --- Delete ---

  confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const bucket = this.buckets.find(b => b.id === id)
    if (!bucket) return

    if (bucket.is_default) {
      alert("Cannot delete the default bucket. Reassign the default first.")
      return
    }

    this.deletingId = id
    this.deleteModalNameTarget.textContent = bucket.name
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
        // Refresh all buckets (default bucket balance may have changed)
        const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
        if (res.ok) this.buckets = await res.json()
        this._rebuildAccountFilter()
        this.renderTable()
      }
    } catch (e) {}

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Active Toggle ---

  async toggleActive(event) {
    const btn = event.currentTarget
    const id = Number(btn.dataset.id)
    const bucket = this.buckets.find(b => b.id === id)
    if (!bucket) return

    const nowActive = !bucket.is_active

    try {
      const response = await fetch(`${this.apiUrlValue}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ bucket: { is_active: nowActive } })
      })
      if (response.ok) {
        const updated = await response.json()
        const idx = this.buckets.findIndex(b => b.id === id)
        if (idx !== -1) this.buckets[idx] = updated
        this.renderTable()
      }
    } catch (e) {}
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter") { event.preventDefault(); this.saveModal() }
    else if (event.key === "Escape") { event.preventDefault(); this.cancelModal() }
  }

  // --- Rendering ---

  renderTable() {
    let filtered = this.buckets
    if (this.filterAccountId) {
      filtered = this.buckets.filter(b => b.account_id === Number(this.filterAccountId))
    }

    if (filtered.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No buckets yet. Click "Add Bucket" to create one.</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = filtered.map(b => this._renderRow(b)).join("")
  }

  _renderRow(b) {
    const balance = this._formatAmount(b.current_balance)
    const target = b.target_amount != null ? this._formatAmount(b.target_amount) : "\u2014"
    const defaultBadge = b.is_default ? `<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">Default</span>` : ""

    const activeBg = b.is_active ? "bg-brand-600" : "bg-gray-300"
    const activeKnob = b.is_active ? "translate-x-7" : "translate-x-1"

    // Progress bar
    let progressBar = ""
    if (b.target_amount != null && b.target_amount > 0) {
      const pct = Math.min(100, (parseFloat(b.current_balance) / parseFloat(b.target_amount)) * 100)
      const color = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-brand-500" : "bg-yellow-500"
      progressBar = `<div class="mt-1 w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden"><div class="${color} h-full rounded-full" style="width: ${pct}%"></div></div>`
    }

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">${this._esc(b.name)}${defaultBadge}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(b.account_name || "")}</td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-white text-right font-mono">${balance}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-right">${target}${progressBar}</td>
      <td class="px-4 py-4 text-center">
        <button type="button"
          class="relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${activeBg} focus:outline-none focus:ring-2 focus:ring-purple-300"
          data-id="${b.id}"
          data-action="click->buckets#toggleActive"
          role="switch" aria-checked="${b.is_active}" title="${b.is_active ? 'Active' : 'Inactive'}">
          <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${activeKnob}"></span>
        </button>
      </td>
      <td class="px-4 py-4 text-right space-x-1 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                data-id="${b.id}"
                data-action="click->buckets#openFund"
                title="Fund">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${b.id}"
                data-action="click->buckets#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition ${b.is_default ? 'opacity-30 cursor-not-allowed' : ''}"
                data-id="${b.id}"
                data-action="click->buckets#confirmDelete"
                title="${b.is_default ? 'Cannot delete default bucket' : 'Delete'}"
                ${b.is_default ? 'disabled' : ''}>
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  _formatAmount(amount) {
    const num = parseFloat(amount)
    if (!num && num !== 0) return "&mdash;"
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // --- Dropdown Builders ---

  _rebuildModalAccountDropdown() {
    let html = `<option value="">Select account...</option>`
    html += this.accounts.map(a => `<option value="${a.id}">${this._esc(a.name)}</option>`).join("")
    this.modalAccountTarget.innerHTML = html
  }

  // --- Modal Helpers ---

  _showModalError(message) {
    this.modalErrorTarget.classList.remove("hidden")
    this.modalErrorTarget.querySelector("p").textContent = message
  }

  _showFundError(message) {
    this.fundErrorTarget.classList.remove("hidden")
    this.fundErrorTarget.querySelector("p").textContent = message
  }

  _registerModalEscape() {
    this._modalEscapeHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (!this.fundModalTarget.classList.contains("hidden")) this.cancelFund()
        else this.cancelModal()
      }
    }
    document.addEventListener("keydown", this._modalEscapeHandler)
  }

  _unregisterModalEscape() {
    if (this._modalEscapeHandler) {
      document.removeEventListener("keydown", this._modalEscapeHandler)
      this._modalEscapeHandler = null
    }
  }

  // --- Helpers ---

  _esc(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
