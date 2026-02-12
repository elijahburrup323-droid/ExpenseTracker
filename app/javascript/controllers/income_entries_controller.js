import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "generateButton", "deleteModal", "deleteModalName", "sortHeader", "total",
    "dateWarningModal", "dateWarningMessage", "deleteBlockedModal", "deleteBlockedMessage"
  ]
  static values = { apiUrl: String, accountsUrl: String, frequenciesUrl: String, recurringsUrl: String, generateUrl: String, csrfToken: String, openMonthUrl: String }

  connect() {
    this.entries = []
    this.accounts = []
    this.frequencies = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this._skipDateValidation = false
    this._pendingSave = null
    this.sortColumn = null
    this.sortDirection = "asc"
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const [entRes, accRes, freqRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.frequenciesUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (entRes.ok) this.entries = await entRes.json()
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

  // --- Generate Data ---

  async generateData() {
    if (this.state !== "idle") return
    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`

    try {
      const response = await fetch(this.generateUrlValue, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        }
      })
      if (response.ok) {
        const data = await response.json()
        await this.fetchAll()
        if (data.generated > 0) {
          btn.innerHTML = `<svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>${data.generated} generated`
        } else {
          btn.innerHTML = `<svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Up to date`
        }
        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false }, 2000)
      } else {
        btn.innerHTML = originalText
        btn.disabled = false
      }
    } catch (e) {
      btn.innerHTML = originalText
      btn.disabled = false
    }
  }

  // --- State Transitions ---

  startAdding() {
    if (this.state === "adding") return
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    this.state = "adding"
    this.renderTable()
    const dateInput = this.tableBodyTarget.querySelector("input[name='entry_date']")
    if (dateInput) dateInput.focus()
  }

  cancelAdding() {
    this.state = "idle"
    this.renderTable()
  }

  async saveNew() {
    const source_name = this._val("source_name")
    const description = this._val("description")
    const entry_date = this._val("entry_date")
    const amount = this._val("amount") || "0"
    const account_id = this._selectVal("account_id") || null
    const frequency_master_id = this._selectVal("frequency_master_id") || null

    if (!source_name) { this.showRowError("Source Name is required"); return }
    if (!entry_date) { this.showRowError("Date is required"); return }

    if (!this._skipDateValidation) {
      const dateOk = await this._validateEntryDate(entry_date, "new")
      if (!dateOk) return
    }
    this._skipDateValidation = false

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ income_entry: { source_name, description, entry_date, amount, account_id, frequency_master_id, received_flag: true } })
      })

      if (response.ok) {
        const newEntry = await response.json()
        this.entries.unshift(newEntry)
        this.state = "idle"
        this.renderTable()
      } else {
        const data = await response.json()
        this.showRowError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this.showRowError("Network error")
    }
  }

  startEditing(event) {
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    const id = Number(event.currentTarget.dataset.id)
    this.state = "editing"
    this.editingId = id
    this.renderTable()
    const nameInput = this.tableBodyTarget.querySelector("input[name='source_name']")
    if (nameInput) nameInput.focus()
  }

  _startEditingById(id, focusAmount = false) {
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    this.state = "editing"
    this.editingId = id
    this.renderTable()
    if (focusAmount) {
      const amtInput = this.tableBodyTarget.querySelector("input[name='amount']")
      if (amtInput) { amtInput.focus(); amtInput.select() }
    } else {
      const nameInput = this.tableBodyTarget.querySelector("input[name='source_name']")
      if (nameInput) nameInput.focus()
    }
  }

  cancelEditing() {
    this.state = "idle"
    this.editingId = null
    this.renderTable()
  }

  async saveEdit() {
    const source_name = this._val("source_name")
    const description = this._val("description")
    const entry_date = this._val("entry_date")
    const amount = this._val("amount") || "0"
    const account_id = this._selectVal("account_id") || null
    const frequency_master_id = this._selectVal("frequency_master_id") || null

    if (!source_name) { this.showRowError("Source Name is required"); return }
    if (!entry_date) { this.showRowError("Date is required"); return }

    if (!this._skipDateValidation) {
      const dateOk = await this._validateEntryDate(entry_date, "edit")
      if (!dateOk) return
    }
    this._skipDateValidation = false

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ income_entry: { source_name, description, entry_date, amount, account_id, frequency_master_id } })
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.entries.findIndex(e => e.id === this.editingId)
        if (idx !== -1) this.entries[idx] = updated
        this.state = "idle"
        this.editingId = null
        this.renderTable()
      } else {
        const data = await response.json()
        this.showRowError(data.errors?.[0] || "Failed to save")
      }
    } catch (e) {
      this.showRowError("Network error")
    }
  }

  async confirmDelete(event) {
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null; this.renderTable() }
    const id = Number(event.currentTarget.dataset.id)
    const entry = this.entries.find(e => e.id === id)
    if (!entry) return

    // Check if entry date falls outside the open month
    if (this.openMonthUrlValue && entry.entry_date) {
      try {
        const res = await fetch(this.openMonthUrlValue, { headers: { "Accept": "application/json" } })
        if (res.ok) {
          const openMonth = await res.json()
          const [year, month] = entry.entry_date.split("-").map(Number)
          if (year !== openMonth.current_year || month !== openMonth.current_month) {
            const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" })
            const openMonthName = new Date(openMonth.current_year, openMonth.current_month - 1).toLocaleString("en-US", { month: "long" })
            this.deleteBlockedMessageTarget.innerHTML =
              `This deposit is dated <strong class="text-gray-900 dark:text-white">${monthName} ${year}</strong>, which is outside the current open month <strong class="text-gray-900 dark:text-white">${openMonthName} ${openMonth.current_year}</strong>. You can only delete deposits within the open month.`
            this.deleteBlockedModalTarget.classList.remove("hidden")
            return
          }
        }
      } catch (e) {
        // If check fails, allow delete to proceed
      }
    }

    this.deletingId = id
    this.deleteModalNameTarget.textContent = entry.source_name
    this.deleteModalTarget.classList.remove("hidden")
    this.addButtonTarget.disabled = true
  }

  closeDeleteBlocked() {
    this.deleteBlockedModalTarget.classList.add("hidden")
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
        this.entries = this.entries.filter(e => e.id !== this.deletingId)
        this.renderTable()
      }
    } catch (e) {}

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Received Toggle ---

  _renderReceivedToggle(isOn, entryId = null) {
    const bg = isOn ? "bg-purple-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    const dataId = entryId ? `data-id="${entryId}"` : ""
    return `<button type="button"
      class="received-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isOn}" ${dataId}
      data-action="click->income-entries#toggleReceived"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Received: Yes' : 'Received: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleReceived(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    // Update visual state immediately
    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Received: Yes" : "Received: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-purple-600", nowOn ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const entryId = btn.dataset.id
    if (entryId && this.state === "idle") {
      try {
        const response = await fetch(`${this.apiUrlValue}/${entryId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ income_entry: { received_flag: nowOn } })
        })
        if (response.ok) {
          const updated = await response.json()
          const idx = this.entries.findIndex(e => e.id === Number(entryId))
          if (idx !== -1) this.entries[idx] = updated

          // When toggled ON, switch to edit mode with focus on Amount
          if (nowOn) {
            this._startEditingById(Number(entryId), true)
          }
        }
      } catch (e) {
        // Revert on error
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "Received: Yes" : "Received: No"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-purple-600", wasOn ? "bg-purple-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
  }

  // --- Field Auto-Advance ---

  // Field sequence for add/edit rows (left to right)
  get _fieldSequence() {
    return ["entry_date", "account_id", "source_name", "description", "amount", "frequency_master_id"]
  }

  advanceField(event) {
    const name = event.target.name
    const seq = this._fieldSequence
    const idx = seq.indexOf(name)
    if (idx < 0 || idx >= seq.length - 1) return
    const nextName = seq[idx + 1]
    const next = this.tableBodyTarget.querySelector(`[name='${nextName}']`)
    if (next) { next.focus(); if (next.select) next.select() }
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      if (this.state === "adding") this.saveNew()
      else if (this.state === "editing") this.saveEdit()
    } else if (event.key === "Escape") {
      event.preventDefault()
      if (this.state === "adding") this.cancelAdding()
      else if (this.state === "editing") this.cancelEditing()
    }
  }

  // --- Sorting ---

  sort(event) {
    const key = event.currentTarget.dataset.sortKey
    if (this.sortColumn === key) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc"
    } else {
      this.sortColumn = key
      this.sortDirection = "asc"
    }
    this._applySortArrows()
    this._sortEntries()
    this.renderTable()
  }

  _applySortArrows() {
    this.sortHeaderTargets.forEach(th => {
      const arrow = th.querySelector("[data-sort-arrow]")
      if (!arrow) return
      if (th.dataset.sortKey === this.sortColumn) {
        arrow.textContent = this.sortDirection === "asc" ? "\u25B2" : "\u25BC"
      } else {
        arrow.textContent = ""
      }
    })
  }

  _sortEntries() {
    if (!this.sortColumn) return
    const key = this.sortColumn
    const dir = this.sortDirection === "asc" ? 1 : -1
    this.entries.sort((a, b) => {
      let valA = a[key], valB = b[key]
      if (key === "amount") {
        return (parseFloat(valA || 0) - parseFloat(valB || 0)) * dir
      }
      valA = (valA || "").toString().toLowerCase()
      valB = (valB || "").toString().toLowerCase()
      if (valA < valB) return -1 * dir
      if (valA > valB) return 1 * dir
      return 0
    })
  }

  // --- Rendering ---

  renderTable() {
    let html = ""

    if (this.state === "adding") {
      html += this._renderAddRow()
    }

    for (const entry of this.entries) {
      if (this.state === "editing" && entry.id === this.editingId) {
        html += this._renderEditRow(entry)
      } else {
        html += this._renderDisplayRow(entry)
      }
    }

    if (this.entries.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="8" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No deposits yet. They will be generated from your Recurring Deposits, or click "Add Deposit" to create one manually.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
    this._updateTotal()
  }

  _updateTotal() {
    if (!this.hasTotalTarget) return
    const sum = this.entries.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0)
    this.totalTarget.textContent = `— Total: ${sum.toLocaleString("en-US", { style: "currency", currency: "USD" })}`
  }

  _formatAmount(amount) {
    const num = parseFloat(amount)
    if (!num && num !== 0) return "&mdash;"
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  _renderDisplayRow(entry) {
    const receivedToggle = this._renderReceivedToggle(entry.received_flag, entry.id)
    const pendingClass = entry.received_flag ? "" : "opacity-60 italic"

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${pendingClass}">
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${entry.entry_date || ""}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(entry.account_name || "—")}</td>
      <td class="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">${this._esc(entry.source_name)}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(entry.description || "")}</td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-white text-right font-mono">${this._formatAmount(entry.amount)}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(entry.frequency_name || "—")}</td>
      <td class="px-4 py-4 text-center">${receivedToggle}</td>
      <td class="px-4 py-4 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${entry.id}"
                data-action="click->income-entries#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${entry.id}"
                data-action="click->income-entries#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  _renderAddRow() {
    const accOptions = this.accounts.map(a => `<option value="${a.id}">${this._esc(a.name)}</option>`).join("")
    const freqOptions = this.frequencies.map(f => `<option value="${f.frequency_master_id}">${this._esc(f.name)}</option>`).join("")
    const today = new Date().toISOString().split("T")[0]

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-4 py-3">
        <input type="date" name="entry_date" value="${today}"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->income-entries#handleKeydown change->income-entries#advanceField">
      </td>
      <td class="px-4 py-3">
        <select name="account_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
                data-action="change->income-entries#advanceField">
          <option value="">No Account</option>
          ${accOptions}
        </select>
      </td>
      <td class="px-4 py-3">
        <input type="text" name="source_name" value="" placeholder="Source Name" maxlength="80"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->income-entries#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <input type="text" name="description" value="" placeholder="Description" maxlength="255"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->income-entries#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
          <input type="number" name="amount" value="" placeholder="0.00" step="0.01"
                 class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5 text-right"
                 data-action="keydown->income-entries#handleKeydown">
        </div>
      </td>
      <td class="px-4 py-3">
        <select name="frequency_master_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5">
          <option value="">None</option>
          ${freqOptions}
        </select>
      </td>
      <td class="px-4 py-3 text-center">
        ${this._renderReceivedToggle(true)}
      </td>
      <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->income-entries#saveNew"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->income-entries#cancelAdding"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-income-entries-target="rowError">
      <td colspan="8" class="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  _renderEditRow(entry) {
    const accOptions = this.accounts.map(a => {
      const selected = a.id === entry.account_id ? "selected" : ""
      return `<option value="${a.id}" ${selected}>${this._esc(a.name)}</option>`
    }).join("")
    const freqOptions = this.frequencies.map(f => {
      const selected = f.frequency_master_id === entry.frequency_master_id ? "selected" : ""
      return `<option value="${f.frequency_master_id}" ${selected}>${this._esc(f.name)}</option>`
    }).join("")
    const amtVal = parseFloat(entry.amount) || ""

    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-4 py-3">
        <input type="date" name="entry_date" value="${entry.entry_date || ""}"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->income-entries#handleKeydown change->income-entries#advanceField">
      </td>
      <td class="px-4 py-3">
        <select name="account_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
                data-action="change->income-entries#advanceField">
          <option value="">No Account</option>
          ${accOptions}
        </select>
      </td>
      <td class="px-4 py-3">
        <input type="text" name="source_name" value="${this._escAttr(entry.source_name)}" placeholder="Source Name" maxlength="80"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->income-entries#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <input type="text" name="description" value="${this._escAttr(entry.description || "")}" placeholder="Description" maxlength="255"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->income-entries#handleKeydown">
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
          <input type="number" name="amount" value="${amtVal}" placeholder="0.00" step="0.01"
                 class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5 text-right"
                 data-action="keydown->income-entries#handleKeydown">
        </div>
      </td>
      <td class="px-4 py-3">
        <select name="frequency_master_id"
                class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5">
          <option value="">None</option>
          ${freqOptions}
        </select>
      </td>
      <td class="px-4 py-3 text-center">
        ${this._renderReceivedToggle(entry.received_flag)}
      </td>
      <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->income-entries#saveEdit"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->income-entries#cancelEditing"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-income-entries-target="rowError">
      <td colspan="8" class="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  // --- Date Validation Against Open Month ---

  async _validateEntryDate(entryDate, saveType) {
    if (!this.openMonthUrlValue) return true
    try {
      const res = await fetch(this.openMonthUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return true
      const openMonth = await res.json()
      const [year, month] = entryDate.split("-").map(Number)
      if (year === openMonth.current_year && month === openMonth.current_month) return true

      const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" })
      const openMonthName = new Date(openMonth.current_year, openMonth.current_month - 1).toLocaleString("en-US", { month: "long" })
      this._pendingSave = saveType
      this._pendingEntryDate = entryDate
      this.dateWarningMessageTarget.innerHTML =
        `The deposit date <strong class="text-gray-900 dark:text-white">${monthName} ${year}</strong> falls outside the current open month <strong class="text-gray-900 dark:text-white">${openMonthName} ${openMonth.current_year}</strong>.<br><br>Would you like to close the current month and advance to <strong class="text-gray-900 dark:text-white">${monthName} ${year}</strong>?`
      this.dateWarningModalTarget.classList.remove("hidden")
      return false
    } catch (e) {
      return true
    }
  }

  async proceedDateWarning() {
    this.dateWarningModalTarget.classList.add("hidden")
    const [year, month] = this._pendingEntryDate.split("-").map(Number)
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
    if (this._pendingSave === "new") this.saveNew()
    else this.saveEdit()
  }

  cancelDateWarning() {
    this.dateWarningModalTarget.classList.add("hidden")
    this._pendingSave = null
    this._pendingEntryDate = null
  }

  // --- Helpers ---

  _val(name) { return this.tableBodyTarget.querySelector(`input[name='${name}']`)?.value?.trim() }
  _selectVal(name) { return this.tableBodyTarget.querySelector(`select[name='${name}']`)?.value }

  _esc(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  _escAttr(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
  }

  showRowError(message) {
    const errorRow = this.tableBodyTarget.querySelector("[data-income-entries-target='rowError']")
    if (errorRow) {
      errorRow.classList.remove("hidden")
      errorRow.querySelector("td").textContent = message
    }
  }
}
