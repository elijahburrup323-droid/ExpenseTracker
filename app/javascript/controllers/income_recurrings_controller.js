import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "generateButton", "deleteModal", "deleteModalName",
    "entryModal", "modalTitle", "modalName", "modalDescription", "modalAmount",
    "modalAccount", "modalFrequency", "modalNextDate", "modalError"
  ]
  static values = { apiUrl: String, accountsUrl: String, frequenciesUrl: String, csrfToken: String }

  connect() {
    this.recurrings = []
    this.accounts = []
    this.frequencies = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
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

  // --- Generate Data ---

  async generateData() {
    if (this.state !== "idle") return
    if (this.frequencies.length === 0) {
      alert("Please enable some Income Frequencies first.")
      return
    }

    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`
    this.addButtonTarget.disabled = true

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const today = new Date().toISOString().split("T")[0]

    const dummyData = [
      { name: "Primary Salary", description: "Full-time employment income", amount: "5000.00" },
      { name: "Freelance Design", description: "Contract design work", amount: "1500.00" },
      { name: "Rental Income", description: "Property rental payments", amount: "1200.00" },
      { name: "Dividend Income", description: "Stock dividends", amount: "350.00" },
      { name: "Side Business", description: "Online store revenue", amount: "800.00" },
      { name: "Consulting", description: "Part-time consulting", amount: "2000.00" },
      { name: "Royalties", description: "Book and media royalties", amount: "250.00" },
      { name: "Interest Income", description: "Savings account interest", amount: "45.00" }
    ]

    for (const item of dummyData) {
      const freq = pick(this.frequencies)
      const acc = this.accounts.length > 0 ? pick(this.accounts) : null
      try {
        const response = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ income_recurring: {
            name: item.name,
            description: item.description,
            amount: item.amount,
            account_id: acc?.id || null,
            frequency_master_id: freq.frequency_master_id,
            next_date: today,
            use_flag: true
          }})
        })
        if (response.ok) {
          const newRec = await response.json()
          this.recurrings.push(newRec)
        }
      } catch (e) {
        // skip on error
      }
    }

    btn.innerHTML = originalText
    btn.disabled = false
    this.addButtonTarget.disabled = false
    this.renderTable()
  }

  // --- Modal Operations ---

  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"

    this.modalTitleTarget.textContent = "Add Deposit Source"
    this.modalNameTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this.modalAmountTarget.value = ""
    this._rebuildAccountDropdown()
    this._rebuildFrequencyDropdown()
    this.modalNextDateTarget.value = new Date().toISOString().split("T")[0]
    this.modalErrorTarget.classList.add("hidden")

    this.entryModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const rec = this.recurrings.find(r => r.id === id)
    if (!rec) return

    this.state = "editing"
    this.editingId = id

    this.modalTitleTarget.textContent = "Edit Deposit Source"
    this.modalNameTarget.value = rec.name || ""
    this.modalDescriptionTarget.value = rec.description || ""
    this.modalAmountTarget.value = parseFloat(rec.amount) || ""
    this._rebuildAccountDropdown()
    this.modalAccountTarget.value = String(rec.account_id || "")
    this._rebuildFrequencyDropdown()
    this.modalFrequencyTarget.value = String(rec.frequency_master_id || "")
    this.modalNextDateTarget.value = rec.next_date || ""
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
    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()
    const amount = this.modalAmountTarget.value.trim() || "0"
    const account_id = this.modalAccountTarget.value || null
    const frequency_master_id = this.modalFrequencyTarget.value
    const next_date = this.modalNextDateTarget.value

    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return }
    if (!frequency_master_id) { this._showModalError("Frequency is required"); this.modalFrequencyTarget.focus(); return }
    if (!next_date) { this._showModalError("Next Date is required"); this.modalNextDateTarget.focus(); return }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ income_recurring: { name, description, amount, account_id, frequency_master_id, next_date, use_flag: true } })
      })

      if (response.ok) {
        const newRec = await response.json()
        this.recurrings.push(newRec)
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
    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()
    const amount = this.modalAmountTarget.value.trim() || "0"
    const account_id = this.modalAccountTarget.value || null
    const frequency_master_id = this.modalFrequencyTarget.value
    const next_date = this.modalNextDateTarget.value

    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return }
    if (!frequency_master_id) { this._showModalError("Frequency is required"); this.modalFrequencyTarget.focus(); return }
    if (!next_date) { this._showModalError("Next Date is required"); this.modalNextDateTarget.focus(); return }

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ income_recurring: { name, description, amount, account_id, frequency_master_id, next_date } })
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
    this.deleteModalNameTarget.textContent = rec.name
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
      data-action="click->income-recurrings#toggleUse"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Use: Yes' : 'Use: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleUse(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Use: Yes" : "Use: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-brand-600", nowOn ? "bg-brand-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const recId = btn.dataset.id
    if (recId && this.state === "idle") {
      try {
        const response = await fetch(`${this.apiUrlValue}/${recId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ income_recurring: { use_flag: nowOn } })
        })
        if (response.ok) {
          const updated = await response.json()
          const idx = this.recurrings.findIndex(r => r.id === Number(recId))
          if (idx !== -1) this.recurrings[idx] = updated
        }
      } catch (e) {
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "Use: Yes" : "Use: No"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-brand-600", wasOn ? "bg-brand-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.saveModal()
    } else if (event.key === "Escape") {
      event.preventDefault()
      this.cancelModal()
    }
  }

  // --- Rendering ---

  renderTable() {
    let html = ""

    for (const rec of this.recurrings) {
      html += this._renderDisplayRow(rec)
    }

    if (this.recurrings.length === 0) {
      html = `<tr><td colspan="8" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No deposit sources yet. Click "Add Deposit Source" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  _formatAmount(amount) {
    const num = parseFloat(amount)
    if (!num && num !== 0) return "&mdash;"
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  _renderDisplayRow(rec) {
    const useToggle = this._renderUseToggle(rec.use_flag, rec.id)

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">${this._esc(rec.name)}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.description || "")}</td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums font-mono">${this._formatAmount(rec.amount)}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.account_name || "\u2014")}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.frequency_name || "")}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${rec.next_date || ""}</td>
      <td class="px-4 py-4 text-center">${useToggle}</td>
      <td class="px-4 py-4 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${rec.id}"
                data-action="click->income-recurrings#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${rec.id}"
                data-action="click->income-recurrings#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  // --- Dropdown Builders ---

  _rebuildAccountDropdown() {
    let html = `<option value="">No Account</option>`
    html += this.accounts.map(a => `<option value="${a.id}">${this._esc(a.name)}</option>`).join("")
    this.modalAccountTarget.innerHTML = html
  }

  _rebuildFrequencyDropdown() {
    let html = `<option value="">Select frequency...</option>`
    html += this.frequencies.map(f => `<option value="${f.frequency_master_id}">${this._esc(f.name)}</option>`).join("")
    this.modalFrequencyTarget.innerHTML = html
  }

  // --- Modal Helpers ---

  _showModalError(message) {
    this.modalErrorTarget.classList.remove("hidden")
    this.modalErrorTarget.querySelector("p").textContent = message
  }

  _registerModalEscape() {
    this._modalEscapeHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        this.cancelModal()
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
