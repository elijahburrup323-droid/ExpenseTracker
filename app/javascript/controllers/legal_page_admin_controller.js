import { Controller } from "@hotwired/stimulus"

function esc(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = [
    "tableBody",
    "modal", "modalTitle", "modalNumber", "modalOrder", "modalTitle2", "modalBody", "modalError",
    "deleteModal", "deleteModalName"
  ]
  static values = { apiUrl: String, previewUrl: String, csrfToken: String }

  connect() {
    this.sections = []
    this.editingId = null
    this.deletingId = null
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) this.sections = await res.json()
      this.renderTable()
    } catch (e) {
      console.error("Failed to load sections:", e)
    }
  }

  renderTable() {
    if (this.sections.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No sections yet. Click "Add Section" to create one.</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = this.sections.map(s => {
      const activeBg = s.is_active ? "bg-green-600" : "bg-gray-300"
      const activeKnob = s.is_active ? "translate-x-7" : "translate-x-1"
      const updated = s.updated_at ? new Date(s.updated_at).toLocaleDateString() : ""

      return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">${s.display_order}</td>
        <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">${s.section_number}</td>
        <td class="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">${esc(s.section_title)}</td>
        <td class="px-4 py-4 text-center">
          <button type="button"
            class="relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${activeBg} focus:outline-none focus:ring-2 focus:ring-green-300"
            data-id="${s.id}" data-action="click->legal-page-admin#toggleActive"
            role="switch" aria-checked="${s.is_active}" title="${s.is_active ? 'Active' : 'Inactive'}">
            <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${activeKnob}"></span>
          </button>
        </td>
        <td class="px-4 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">${updated}</td>
        <td class="px-4 py-4 text-right space-x-1 whitespace-nowrap">
          <button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                  data-id="${s.id}" data-action="click->legal-page-admin#openEditModal" title="Edit">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                  data-id="${s.id}" data-action="click->legal-page-admin#confirmDelete" title="Delete">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      </tr>`
    }).join("")
  }

  // --- Modal ---

  openAddModal() {
    this.editingId = null
    this.modalTitleTarget.textContent = "Add Section"
    this.modalNumberTarget.value = ""
    this.modalOrderTarget.value = this.sections.length + 1
    this.modalTitle2Target.value = ""
    this.modalBodyTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalTarget.classList.remove("hidden")
    this.modalTitle2Target.focus()
  }

  openEditModal(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const s = this.sections.find(x => x.id === id)
    if (!s) return

    this.editingId = id
    this.modalTitleTarget.textContent = "Edit Section"
    this.modalNumberTarget.value = s.section_number
    this.modalOrderTarget.value = s.display_order
    this.modalTitle2Target.value = s.section_title
    this.modalBodyTarget.value = s.section_body
    this.modalErrorTarget.classList.add("hidden")
    this.modalTarget.classList.remove("hidden")
    this.modalTitle2Target.focus()
  }

  closeModal() {
    this.modalTarget.classList.add("hidden")
    this.editingId = null
  }

  async saveModal() {
    const section_number = parseInt(this.modalNumberTarget.value)
    const display_order = parseInt(this.modalOrderTarget.value)
    const section_title = this.modalTitle2Target.value.trim()
    const section_body = this.modalBodyTarget.value.trim()

    if (!section_number) { this._showError("Section number is required"); return }
    if (!section_title) { this._showError("Section title is required"); return }
    if (!section_body) { this._showError("Section body is required"); return }

    const body = { legal_page_section: { section_number, display_order, section_title, section_body } }
    const url = this.editingId ? `${this.apiUrlValue}/${this.editingId}` : this.apiUrlValue
    const method = this.editingId ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        this.closeModal()
        this.fetchAll()
      } else {
        const data = await res.json()
        this._showError((data.errors || ["Save failed"]).join(", "))
      }
    } catch (e) {
      this._showError("Network error")
    }
  }

  // --- Active Toggle ---

  async toggleActive(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const s = this.sections.find(x => x.id === id)
    if (!s) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ legal_page_section: { is_active: !s.is_active } })
      })
      if (res.ok) this.fetchAll()
    } catch (e) {}
  }

  // --- Delete ---

  confirmDelete(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const s = this.sections.find(x => x.id === id)
    if (!s) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = s.section_title
    this.deleteModalTarget.classList.remove("hidden")
  }

  closeDeleteModal() {
    this.deleteModalTarget.classList.add("hidden")
    this.deletingId = null
  }

  async executeDelete() {
    if (!this.deletingId) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (res.ok) this.fetchAll()
    } catch (e) {}

    this.closeDeleteModal()
  }

  // --- Helpers ---

  _showError(msg) {
    this.modalErrorTarget.classList.remove("hidden")
    this.modalErrorTarget.querySelector("p").textContent = msg
  }
}
