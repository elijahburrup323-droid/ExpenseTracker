import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "generateButton",
    "entryModal", "modalTitle", "modalName", "modalDescription", "modalAmount",
    "modalAccount", "modalCategory", "modalFrequency", "modalNextDate", "modalError",
    "deleteModal", "deleteModalName"
  ]
  static values = { apiUrl: String, accountsUrl: String, categoriesUrl: String, frequenciesUrl: String, csrfToken: String }

  connect() {
    this.recurrings = []
    this.accounts = []
    this.categories = []
    this.frequencies = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const [recRes, accRes, catRes, freqRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.categoriesUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.frequenciesUrlValue, { headers: { "Accept": "application/json" } })
      ])
      if (recRes.ok) this.recurrings = await recRes.json()
      if (accRes.ok) this.accounts = await accRes.json()
      if (catRes.ok) this.categories = await catRes.json()
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
    if (this.frequencies.length === 0) { alert("Please enable some Income Frequencies first."); return }
    if (this.accounts.length === 0) { alert("Please create at least one Account first."); return }
    if (this.categories.length === 0) { alert("Please create at least one Spending Category first."); return }

    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`
    this.addButtonTarget.disabled = true

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const today = new Date().toISOString().split("T")[0]

    const dummyData = [
      { name: "Rent/Mortgage", description: "Monthly housing payment", amount: "1500.00" },
      { name: "Electric Bill", description: "Monthly electricity", amount: "120.00" },
      { name: "Water Bill", description: "Monthly water/sewer", amount: "65.00" },
      { name: "Internet", description: "Home internet service", amount: "79.99" },
      { name: "Car Insurance", description: "Auto insurance premium", amount: "145.00" },
      { name: "Phone Bill", description: "Mobile phone plan", amount: "85.00" },
      { name: "Streaming Services", description: "Netflix, Hulu, etc.", amount: "35.00" },
      { name: "Gym Membership", description: "Monthly fitness membership", amount: "50.00" }
    ]

    for (const item of dummyData) {
      try {
        const response = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
          body: JSON.stringify({ payment_recurring: {
            name: item.name, description: item.description, amount: item.amount,
            account_id: pick(this.accounts).id, spending_category_id: pick(this.categories).id,
            frequency_master_id: pick(this.frequencies).frequency_master_id,
            next_date: today, use_flag: true
          }})
        })
        if (response.ok) this.recurrings.push(await response.json())
      } catch (e) {}
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

    this.modalTitleTarget.textContent = "Add Recurring Payment"
    this._rebuildDropdowns()
    this.modalNameTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this.modalAmountTarget.value = ""
    this.modalNextDateTarget.value = new Date().toISOString().split("T")[0]
    this.modalErrorTarget.classList.add("hidden")

    this.entryModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const rec = this.recurrings.find(r => r.id === id)
    if (!rec) return

    this.state = "editing"
    this.editingId = id

    this.modalTitleTarget.textContent = "Edit Recurring Payment"
    this._rebuildDropdowns()
    this.modalNameTarget.value = rec.name || ""
    this.modalDescriptionTarget.value = rec.description || ""
    this.modalAmountTarget.value = parseFloat(rec.amount) || ""
    this.modalAccountTarget.value = String(rec.account_id || "")
    this.modalCategoryTarget.value = String(rec.spending_category_id || "")
    this.modalFrequencyTarget.value = String(rec.frequency_master_id || "")
    this.modalNextDateTarget.value = rec.next_date || ""
    this.modalErrorTarget.classList.add("hidden")

    this.entryModalTarget.classList.remove("hidden")
    setTimeout(() => this.modalNameTarget.focus(), 50)
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
        body: JSON.stringify({ payment_recurring: { ...payload, use_flag: true } })
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
        body: JSON.stringify({ payment_recurring: payload })
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
    const bg = isOn ? "bg-purple-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    const dataId = recId ? `data-id="${recId}"` : ""
    return `<button type="button"
      class="use-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isOn}" ${dataId}
      data-action="click->payment-recurrings#toggleUse"
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
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-purple-600", nowOn ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const recId = btn.dataset.id
    if (recId && this.state === "idle") {
      try {
        const response = await fetch(`${this.apiUrlValue}/${recId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
          body: JSON.stringify({ payment_recurring: { use_flag: nowOn } })
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
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-purple-600", wasOn ? "bg-purple-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter") { event.preventDefault(); this.saveModal() }
    else if (event.key === "Escape") { event.preventDefault(); this.cancelModal() }
  }

  // --- Rendering ---

  renderTable() {
    if (this.recurrings.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No recurring payments yet. Click "Add Recurring Payment" to create one.</td></tr>`
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
    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">${this._esc(rec.name)}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.description || "")}</td>
      <td class="px-4 py-4 text-sm text-gray-900 dark:text-white text-right font-mono">${this._formatAmount(rec.amount)}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.account_name || "\u2014")}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.category_name || "\u2014")}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${this._esc(rec.frequency_name || "")}</td>
      <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">${rec.next_date || ""}</td>
      <td class="px-4 py-4 text-center">${this._renderUseToggle(rec.use_flag, rec.id)}</td>
      <td class="px-4 py-4 text-right space-x-2 whitespace-nowrap">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${rec.id}"
                data-action="click->payment-recurrings#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${rec.id}"
                data-action="click->payment-recurrings#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  // --- Modal Helpers ---

  _rebuildDropdowns() {
    let accHtml = `<option value="">Select account...</option>`
    accHtml += this.accounts.map(a => `<option value="${a.id}">${this._esc(a.name)}</option>`).join("")
    this.modalAccountTarget.innerHTML = accHtml

    let catHtml = `<option value="">Select category...</option>`
    catHtml += this.categories.map(c => `<option value="${c.id}">${this._esc(c.name)}</option>`).join("")
    this.modalCategoryTarget.innerHTML = catHtml

    let freqHtml = `<option value="">Select frequency...</option>`
    freqHtml += this.frequencies.map(f => `<option value="${f.frequency_master_id}">${this._esc(f.name)}</option>`).join("")
    this.modalFrequencyTarget.innerHTML = freqHtml
  }

  _getModalPayload() {
    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()
    const amount = this.modalAmountTarget.value.trim() || "0"
    const account_id = this.modalAccountTarget.value
    const spending_category_id = this.modalCategoryTarget.value
    const frequency_master_id = this.modalFrequencyTarget.value
    const next_date = this.modalNextDateTarget.value

    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return null }
    if (!account_id) { this._showModalError("Account is required"); return null }
    if (!spending_category_id) { this._showModalError("Category is required"); return null }
    if (!frequency_master_id) { this._showModalError("Frequency is required"); return null }
    if (!next_date) { this._showModalError("Next Date is required"); return null }

    return { name, description, amount, account_id, spending_category_id, frequency_master_id, next_date }
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
