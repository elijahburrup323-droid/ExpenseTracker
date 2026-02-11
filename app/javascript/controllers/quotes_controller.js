import { Controller } from "@hotwired/stimulus"

function escapeHtml(str) {
  if (!str) return ""
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function escapeAttr(str) {
  if (!str) return ""
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

export default class extends Controller {
  static targets = ["tableBody", "addButton", "deleteModal", "deleteModalName"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.quotes = []
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const response = await fetch(this.apiUrlValue, {
        headers: { "Accept": "application/json" }
      })
      if (response.ok) {
        this.quotes = await response.json()
      }
    } catch (e) {
      // silently fail
    }
    this.renderTable()
  }

  // --- State Transitions ---

  startAdding() {
    if (this.state === "adding") return
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null }
    this.state = "adding"
    this.renderTable()
    const textInput = this.tableBodyTarget.querySelector("textarea[name='quote_text']")
    if (textInput) textInput.focus()
  }

  cancelAdding() {
    this.state = "idle"
    this.renderTable()
  }

  async saveNew() {
    const textInput = this.tableBodyTarget.querySelector("textarea[name='quote_text']")
    const authorInput = this.tableBodyTarget.querySelector("input[name='quote_author']")
    const quoteText = textInput?.value?.trim()
    const quoteAuthor = authorInput?.value?.trim()

    if (!quoteText) {
      this.showRowError("Quote text is required")
      textInput?.focus()
      return
    }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ quote: { quote_text: quoteText, quote_author: quoteAuthor, is_active: true } })
      })

      if (response.ok) {
        const newQuote = await response.json()
        this.quotes.unshift(newQuote)
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
    const textInput = this.tableBodyTarget.querySelector("textarea[name='quote_text']")
    if (textInput) textInput.focus()
  }

  cancelEditing() {
    this.state = "idle"
    this.editingId = null
    this.renderTable()
  }

  async saveEdit() {
    const textInput = this.tableBodyTarget.querySelector("textarea[name='quote_text']")
    const authorInput = this.tableBodyTarget.querySelector("input[name='quote_author']")
    const quoteText = textInput?.value?.trim()
    const quoteAuthor = authorInput?.value?.trim()

    if (!quoteText) {
      this.showRowError("Quote text is required")
      textInput?.focus()
      return
    }

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ quote: { quote_text: quoteText, quote_author: quoteAuthor } })
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.quotes.findIndex(q => q.id === this.editingId)
        if (idx !== -1) this.quotes[idx] = updated
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

  confirmDelete(event) {
    if (this.state !== "idle") { this.state = "idle"; this.editingId = null; this.renderTable() }
    const id = Number(event.currentTarget.dataset.id)
    const q = this.quotes.find(q => q.id === id)
    if (!q) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = q.quote_author || "Unknown"
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
        this.quotes = this.quotes.filter(q => q.id !== this.deletingId)
        this.renderTable()
      }
    } catch (e) {
      // silently fail
    }

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Active Toggle ---

  _renderActiveToggle(isOn, quoteId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    const dataId = quoteId ? `data-id="${quoteId}"` : ""
    return `<button type="button"
      class="active-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-brand-300"
      data-checked="${isOn}" ${dataId}
      data-action="click->quotes#toggleActive"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Active' : 'Inactive'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleActive(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Active" : "Inactive"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-brand-600", nowOn ? "bg-brand-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const quoteId = btn.dataset.id
    if (quoteId && this.state === "idle") {
      try {
        const response = await fetch(`${this.apiUrlValue}/${quoteId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ quote: { is_active: nowOn } })
        })
        if (response.ok) {
          const updated = await response.json()
          const idx = this.quotes.findIndex(q => q.id === Number(quoteId))
          if (idx !== -1) this.quotes[idx] = updated
        }
      } catch (e) {
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "Active" : "Inactive"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-brand-600", wasOn ? "bg-brand-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    }
  }

  // --- Keyboard Handling ---

  handleKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (this.state === "adding") this.saveNew()
      else if (this.state === "editing") this.saveEdit()
    } else if (event.key === "Escape") {
      event.preventDefault()
      if (this.state === "adding") this.cancelAdding()
      else if (this.state === "editing") this.cancelEditing()
    }
  }

  // --- Rendering ---

  renderTable() {
    let html = ""

    if (this.state === "adding") {
      html += this.renderInputRow("", "")
    }

    for (const q of this.quotes) {
      if (this.state === "editing" && q.id === this.editingId) {
        html += this.renderInputRow(q.quote_text, q.quote_author || "")
      } else {
        html += this.renderDisplayRow(q)
      }
    }

    if (this.quotes.length === 0 && this.state !== "adding") {
      html = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No quotes yet. Click "Add Quote" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  renderDisplayRow(q) {
    const activeToggle = this._renderActiveToggle(q.is_active, q.id)
    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md">
        <p class="line-clamp-2">${escapeHtml(q.quote_text)}</p>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(q.quote_author || "")}</td>
      <td class="px-6 py-4 text-center">${activeToggle}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${q.id}"
                data-action="click->quotes#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${q.id}"
                data-action="click->quotes#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  renderInputRow(quoteText, quoteAuthor) {
    const isAdding = this.state === "adding"
    return `<tr class="bg-brand-50/40 dark:bg-brand-900/20">
      <td class="px-6 py-3">
        <textarea name="quote_text" rows="2" placeholder="Enter quote text..."
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->quotes#handleKeydown">${escapeHtml(quoteText)}</textarea>
      </td>
      <td class="px-6 py-3">
        <input type="text" name="quote_author" value="${escapeAttr(quoteAuthor)}" placeholder="Author"
               maxlength="120"
               class="w-full rounded-md border-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-1.5"
               data-action="keydown->quotes#handleKeydown">
      </td>
      <td class="px-6 py-3 text-center">
        ${this._renderActiveToggle(true)}
      </td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-brand-600 hover:bg-brand-700 transition"
                data-action="click->quotes#${isAdding ? 'saveNew' : 'saveEdit'}"
                title="Save">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-8H7v8"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v5h8"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-action="click->quotes#${isAdding ? 'cancelAdding' : 'cancelEditing'}"
                title="Cancel">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </td>
    </tr>
    <tr class="hidden" data-quotes-target="rowError">
      <td colspan="4" class="px-6 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"></td>
    </tr>`
  }

  // --- Error Display ---

  showRowError(message) {
    const errorRow = this.tableBodyTarget.querySelector("[data-quotes-target='rowError']")
    if (errorRow) {
      errorRow.classList.remove("hidden")
      errorRow.querySelector("td").textContent = message
    }
  }
}
