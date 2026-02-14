import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tableBody", "addButton"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.masters = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const response = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (response.ok) this.masters = await response.json()
    } catch (e) { /* silently fail */ }
    this.renderTable()
  }

  // --- State Machine ---

  startAdding() {
    if (this.state === "adding") return
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    this.state = "adding"
    this.editingId = null
    this.renderTable()
  }

  cancelAction() {
    this.state = "idle"
    this.editingId = null
    this.renderTable()
  }

  startEditing(event) {
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    const id = Number(event.currentTarget.dataset.id)
    this.state = "editing"
    this.editingId = id
    this.renderTable()
  }

  // --- CRUD ---

  async saveNew(event) {
    if (event.type === "keydown" && event.key !== "Enter") return
    if (event.key === "Escape") { this.cancelAction(); return }

    const row = this.tableBodyTarget.querySelector("[data-add-row]")
    if (!row) return

    const data = this._collectFormData(row)
    if (!data.name) return

    this.addButtonTarget.disabled = true
    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify({ income_frequency_master: data })
      })
      if (response.ok || response.status === 201) {
        const created = await response.json()
        this.masters.push(created)
        this.masters.sort((a, b) => a.sort_order - b.sort_order)
        this.state = "idle"
      } else {
        const err = await response.json()
        alert((err.errors || ["Save failed"]).join(", "))
      }
    } catch (e) {
      alert("Network error")
    }
    this.addButtonTarget.disabled = false
    this.renderTable()
  }

  async saveEdit(event) {
    if (event.type === "keydown" && event.key !== "Enter") return
    if (event.key === "Escape") { this.cancelAction(); return }

    const row = this.tableBodyTarget.querySelector("[data-edit-row]")
    if (!row) return

    const data = this._collectFormData(row)
    if (!data.name) return

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: this._headers(),
        body: JSON.stringify({ income_frequency_master: data })
      })
      if (response.ok) {
        const updated = await response.json()
        const idx = this.masters.findIndex(m => m.id === this.editingId)
        if (idx !== -1) this.masters[idx] = updated
        this.masters.sort((a, b) => a.sort_order - b.sort_order)
        this.state = "idle"
        this.editingId = null
      } else {
        const err = await response.json()
        alert((err.errors || ["Save failed"]).join(", "))
      }
    } catch (e) {
      alert("Network error")
    }
    this.renderTable()
  }

  async deleteItem(event) {
    const id = Number(event.currentTarget.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    try {
      const checkResp = await fetch(`${this.apiUrlValue}/${id}/can_delete`, {
        headers: { "Accept": "application/json" }
      })
      const checkData = await checkResp.json()

      if (!checkData.can_delete) {
        this._showCannotDeleteModal()
        return
      }

      this._showDeleteConfirmModal(master.name, async () => {
        try {
          const resp = await fetch(`${this.apiUrlValue}/${id}`, {
            method: "DELETE",
            headers: this._headers()
          })
          if (resp.ok) {
            this.masters = this.masters.filter(m => m.id !== id)
            this.renderTable()
          } else {
            const err = await resp.json()
            if (err.errors?.some(e => e.includes("in use"))) {
              this._showCannotDeleteModal()
            } else {
              alert((err.errors || ["Delete failed"]).join(", "))
            }
          }
        } catch (e) {
          alert("Network error")
        }
      })
    } catch (e) {
      alert("Network error")
    }
  }

  _showCannotDeleteModal() {
    this._removeModal()
    const overlay = document.createElement("div")
    overlay.id = "freqDeleteModal"
    overlay.className = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
    overlay.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Can't Delete Frequency</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">This frequency is currently in use and can't be deleted. Remove or update the items using it, then try again.</p>
        <div class="flex justify-end">
          <button type="button" id="freqModalOk"
                  class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition">
            OK
          </button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    overlay.querySelector("#freqModalOk").addEventListener("click", () => this._removeModal())
    overlay.addEventListener("click", (e) => { if (e.target === overlay) this._removeModal() })
  }

  _showDeleteConfirmModal(name, onConfirm) {
    this._removeModal()
    const overlay = document.createElement("div")
    overlay.id = "freqDeleteModal"
    overlay.className = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
    overlay.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Delete Frequency?</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete this frequency master? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button type="button" id="freqModalCancel"
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">
            Cancel
          </button>
          <button type="button" id="freqModalDelete"
                  class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition">
            Delete
          </button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    overlay.querySelector("#freqModalCancel").addEventListener("click", () => this._removeModal())
    overlay.querySelector("#freqModalDelete").addEventListener("click", () => { this._removeModal(); onConfirm() })
    overlay.addEventListener("click", (e) => { if (e.target === overlay) this._removeModal() })
  }

  _removeModal() {
    document.getElementById("freqDeleteModal")?.remove()
  }

  // --- Active Toggle ---

  async toggleActive(event) {
    const btn = event.currentTarget
    const id = Number(btn.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    const nowActive = !master.active

    // Optimistic UI
    btn.dataset.checked = String(nowActive)
    btn.setAttribute("aria-checked", String(nowActive))
    btn.title = nowActive ? "Active" : "Inactive"
    btn.className = btn.className.replace(nowActive ? "bg-gray-300" : "bg-purple-600", nowActive ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowActive ? "translate-x-1" : "translate-x-7", nowActive ? "translate-x-7" : "translate-x-1")

    try {
      const response = await fetch(`${this.apiUrlValue}/${id}`, {
        method: "PUT",
        headers: this._headers(),
        body: JSON.stringify({ income_frequency_master: { active: nowActive } })
      })
      if (response.ok) {
        const updated = await response.json()
        const idx = this.masters.findIndex(m => m.id === id)
        if (idx !== -1) this.masters[idx] = updated
      }
    } catch (e) {
      // Revert
      btn.dataset.checked = String(!nowActive)
      btn.setAttribute("aria-checked", String(!nowActive))
      btn.className = btn.className.replace(!nowActive ? "bg-gray-300" : "bg-purple-600", !nowActive ? "bg-purple-600" : "bg-gray-300")
      knob.className = knob.className.replace(!nowActive ? "translate-x-1" : "translate-x-7", !nowActive ? "translate-x-7" : "translate-x-1")
    }
  }

  // --- Form Helpers ---

  _collectFormData(row) {
    const name = row.querySelector("[data-field=name]")?.value?.trim() || ""
    const frequency_type = row.querySelector("[data-field=frequency_type]")?.value || "standard"
    const interval_days = row.querySelector("[data-field=interval_days]")?.value || null
    const day_of_month = row.querySelector("[data-field=day_of_month]")?.value || null
    const is_last_day = row.querySelector("[data-field=is_last_day]")?.checked || false
    const weekday = row.querySelector("[data-field=weekday]")?.value || null
    const ordinal = row.querySelector("[data-field=ordinal]")?.value || null
    const sort_order = row.querySelector("[data-field=sort_order]")?.value || null

    return {
      name,
      frequency_type,
      interval_days: interval_days ? Number(interval_days) : null,
      day_of_month: day_of_month ? Number(day_of_month) : null,
      is_last_day,
      weekday: weekday ? Number(weekday) : null,
      ordinal: ordinal ? Number(ordinal) : null,
      sort_order: sort_order ? Number(sort_order) : null,
    }
  }

  _headers() {
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-CSRF-Token": this.csrfTokenValue
    }
  }

  // --- Pattern Description ---

  _patternDetails(m) {
    switch (m.frequency_type) {
      case "standard":
        if (m.interval_days) return `Every ${m.interval_days} days`
        return m.name
      case "exact_day":
        if (m.is_last_day) return "Last day of each month"
        return `Day ${m.day_of_month} of each month`
      case "ordinal_weekday": {
        const ords = ["", "1st", "2nd", "3rd", "4th"]
        const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        return `${ords[m.ordinal] || ""} ${days[m.weekday] || ""} of each month`
      }
      default: return ""
    }
  }

  _categoryLabel(type) {
    switch (type) {
      case "standard": return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Standard</span>`
      case "exact_day": return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Exact Day</span>`
      case "ordinal_weekday": return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Ordinal Weekday</span>`
      default: return type || ""
    }
  }

  _activeToggle(isOn, id) {
    const bg = isOn ? "bg-purple-600" : "bg-gray-300"
    const knob = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isOn}" data-id="${id}"
      data-action="click->income-frequency-masters#toggleActive"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Active' : 'Inactive'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knob}"></span>
    </button>`
  }

  // --- Rendering ---

  _formRow(master, isEdit) {
    const m = master || { name: "", frequency_type: "standard", interval_days: "", day_of_month: "", is_last_day: false, weekday: "", ordinal: "", sort_order: "" }
    const marker = isEdit ? "data-edit-row" : "data-add-row"
    const action = isEdit ? "income-frequency-masters#saveEdit" : "income-frequency-masters#saveNew"

    return `<tr ${marker} class="bg-brand-50 dark:bg-brand-900/20">
      <td class="px-6 py-3">
        <input data-field="name" type="text" value="${this._escapeAttr(m.name)}"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:ring-brand-500 focus:border-brand-500"
               placeholder="Frequency name"
               data-action="keydown->${action} keydown->income-frequency-masters#handleEscape" autofocus>
      </td>
      <td class="px-6 py-3">
        <select data-field="frequency_type"
                class="rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:ring-brand-500 focus:border-brand-500">
          <option value="standard" ${m.frequency_type === "standard" ? "selected" : ""}>Standard</option>
          <option value="exact_day" ${m.frequency_type === "exact_day" ? "selected" : ""}>Exact Day</option>
          <option value="ordinal_weekday" ${m.frequency_type === "ordinal_weekday" ? "selected" : ""}>Ordinal Weekday</option>
        </select>
      </td>
      <td class="px-6 py-3">
        <div class="flex items-center space-x-2 text-xs">
          <input data-field="interval_days" type="number" value="${m.interval_days || ''}" placeholder="Days" title="Interval days"
                 class="w-16 rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:ring-brand-500 focus:border-brand-500"
                 data-action="keydown->${action} keydown->income-frequency-masters#handleEscape">
          <input data-field="day_of_month" type="number" min="1" max="28" value="${m.day_of_month || ''}" placeholder="Day" title="Day of month"
                 class="w-16 rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:ring-brand-500 focus:border-brand-500"
                 data-action="keydown->${action} keydown->income-frequency-masters#handleEscape">
          <label class="flex items-center space-x-1 font-bold text-gray-600 dark:text-gray-400">
            <input data-field="is_last_day" type="checkbox" ${m.is_last_day ? "checked" : ""} class="rounded border-gray-900 dark:border-gray-600 text-brand-600 focus:ring-brand-500">
            <span>Last</span>
          </label>
          <select data-field="weekday" title="Weekday"
                  class="rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:ring-brand-500 focus:border-brand-500">
            <option value="">Wkday</option>
            <option value="1" ${m.weekday == 1 ? "selected" : ""}>Mon</option>
            <option value="2" ${m.weekday == 2 ? "selected" : ""}>Tue</option>
            <option value="3" ${m.weekday == 3 ? "selected" : ""}>Wed</option>
            <option value="4" ${m.weekday == 4 ? "selected" : ""}>Thu</option>
            <option value="5" ${m.weekday == 5 ? "selected" : ""}>Fri</option>
          </select>
          <select data-field="ordinal" title="Ordinal"
                  class="rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:ring-brand-500 focus:border-brand-500">
            <option value="">Ord</option>
            <option value="1" ${m.ordinal == 1 ? "selected" : ""}>1st</option>
            <option value="2" ${m.ordinal == 2 ? "selected" : ""}>2nd</option>
            <option value="3" ${m.ordinal == 3 ? "selected" : ""}>3rd</option>
            <option value="4" ${m.ordinal == 4 ? "selected" : ""}>4th</option>
          </select>
          <input data-field="sort_order" type="number" value="${m.sort_order || ''}" placeholder="Sort" title="Sort order"
                 class="w-16 rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:ring-brand-500 focus:border-brand-500"
                 data-action="keydown->${action} keydown->income-frequency-masters#handleEscape">
        </div>
      </td>
      <td class="px-6 py-3 text-center">
        <div class="flex items-center justify-center space-x-2">
          <button type="button" class="text-green-600 hover:text-green-800 text-sm font-medium"
                  data-action="click->${action}">Save</button>
          <button type="button" class="text-gray-500 hover:text-gray-700 text-sm font-medium"
                  data-action="click->income-frequency-masters#cancelAction">Cancel</button>
        </div>
      </td>
      <td class="px-6 py-3"></td>
    </tr>`
  }

  handleEscape(event) {
    if (event.key === "Escape") this.cancelAction()
  }

  renderTable() {
    if (this.masters.length === 0 && this.state !== "adding") {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No frequencies configured.</td></tr>`
      return
    }

    let html = ""

    // Add row at top
    if (this.state === "adding") {
      html += this._formRow(null, false)
    }

    for (const m of this.masters) {
      if (this.state === "editing" && this.editingId === m.id) {
        html += this._formRow(m, true)
      } else {
        const escName = this._escapeHtml(m.name)
        html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escName}</td>
          <td class="px-6 py-4 text-sm">${this._categoryLabel(m.frequency_type)}</td>
          <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${this._patternDetails(m)}</td>
          <td class="px-6 py-4 text-center">
            <div class="flex items-center justify-center space-x-3">
              <button type="button" class="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 text-sm font-medium"
                      data-id="${m.id}" data-action="click->income-frequency-masters#startEditing">Edit</button>
              <button type="button" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      data-id="${m.id}" data-action="click->income-frequency-masters#deleteItem">Delete</button>
            </div>
          </td>
          <td class="px-6 py-4 text-center">${this._activeToggle(m.active, m.id)}</td>
        </tr>`
      }
    }

    this.tableBodyTarget.innerHTML = html
  }

  _escapeHtml(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  _escapeAttr(str) {
    return this._escapeHtml(str)
  }
}
