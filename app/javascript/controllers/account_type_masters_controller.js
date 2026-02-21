import { Controller } from "@hotwired/stimulus"

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = [
    "tableBody", "modal", "modalTitle", "modalName", "modalDescription", "modalError",
    "deleteModal", "deleteModalName", "deleteModalError",
    "cannotDeleteModal", "cannotDeleteBody"
  ]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.masters = []
    this.editingId = null
    this.deletingId = null
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      this.masters = await res.json()
      this.renderTable()
    } catch (e) {
      console.error("Failed to load account type masters:", e)
    }
  }

  renderTable() {
    if (this.masters.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No account types yet. Click "Add Account Type" to create one.</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = this.masters.map(m => {
      const bg = m.is_active ? "bg-green-600" : "bg-gray-300"
      const knobTranslate = m.is_active ? "translate-x-7" : "translate-x-1"
      const activeToggle = `<button type="button"
        class="relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-green-300"
        data-id="${m.id}" data-checked="${m.is_active}"
        data-action="click->account-type-masters#toggleActive"
        role="switch" aria-checked="${m.is_active}" title="${m.is_active ? 'Active' : 'Inactive'}">
        <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
      </button>`

      return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(m.display_name)}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[16rem] truncate" title="${escapeHtml(m.description || '')}">${escapeHtml(m.description || "")}</td>
        <td class="px-6 py-4 text-center">${activeToggle}</td>
        <td class="px-6 py-4 text-center space-x-2 whitespace-nowrap">
          <button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                  data-id="${m.id}" data-action="click->account-type-masters#openEditModal" title="Edit">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                  data-id="${m.id}" data-action="click->account-type-masters#confirmDelete" title="Delete">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      </tr>`
    }).join("")
  }

  // --- Modal ---

  openAddModal() {
    this.editingId = null
    this.modalTitleTarget.textContent = "Add Account Type"
    this.modalNameTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalTarget.classList.remove("hidden")
    this.modalNameTarget.focus()
  }

  openEditModal(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    this.editingId = id
    this.modalTitleTarget.textContent = "Edit Account Type"
    this.modalNameTarget.value = master.display_name
    this.modalDescriptionTarget.value = master.description || ""
    this.modalErrorTarget.classList.add("hidden")
    this.modalTarget.classList.remove("hidden")
    this.modalNameTarget.focus()
  }

  closeModal() {
    this.modalTarget.classList.add("hidden")
    this.editingId = null
  }

  modalKeydown(event) {
    if (event.key === "Enter") { event.preventDefault(); this.saveModal() }
    if (event.key === "Escape") { this.closeModal() }
  }

  async saveModal() {
    const display_name = this.modalNameTarget.value.trim()
    if (!display_name) {
      this.modalErrorTarget.textContent = "Name is required."
      this.modalErrorTarget.classList.remove("hidden")
      return
    }

    const body = { account_type_master: { display_name, description: this.modalDescriptionTarget.value.trim() || null } }
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
        this.modalErrorTarget.textContent = (data.errors || ["Save failed"]).join(", ")
        this.modalErrorTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.modalErrorTarget.textContent = "Network error."
      this.modalErrorTarget.classList.remove("hidden")
    }
  }

  // --- Active Toggle ---

  async toggleActive(event) {
    const btn = event.currentTarget
    const id = parseInt(btn.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    const wasOn = master.is_active
    const nowOn = !wasOn

    // Optimistic UI update
    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Active" : "Inactive"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-green-600", nowOn ? "bg-green-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    try {
      const res = await fetch(`${this.apiUrlValue}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ account_type_master: { is_active: nowOn } })
      })
      if (res.ok) {
        master.is_active = nowOn
      } else {
        // Revert on server error
        btn.dataset.checked = String(wasOn)
        btn.setAttribute("aria-checked", String(wasOn))
        btn.title = wasOn ? "Active" : "Inactive"
        btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-green-600", wasOn ? "bg-green-600" : "bg-gray-300")
        knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
      }
    } catch (e) {
      // Revert on network error
      btn.dataset.checked = String(wasOn)
      btn.setAttribute("aria-checked", String(wasOn))
      btn.title = wasOn ? "Active" : "Inactive"
      btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-green-600", wasOn ? "bg-green-600" : "bg-gray-300")
      knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
    }
  }

  // --- Delete ---

  async confirmDelete(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    // Check if can delete
    try {
      const res = await fetch(`${this.apiUrlValue}/${id}/can_delete`, { headers: { "Accept": "application/json" } })
      const data = await res.json()

      if (!data.can_delete) {
        this._populateCannotDeleteModal(data)
        this.cannotDeleteModalTarget.classList.remove("hidden")
        return
      }
    } catch (e) {
      // proceed with delete modal
    }

    this.deletingId = id
    this.deleteModalNameTarget.textContent = master.display_name
    this.deleteModalErrorTarget.classList.add("hidden")
    this.deleteModalTarget.classList.remove("hidden")
  }

  _populateCannotDeleteModal(data) {
    if (!this.hasCannotDeleteBodyTarget) return
    const names = data.account_names || []
    const total = data.total_count || 0
    const overflow = total > 5 ? `<li class="text-gray-400">+${total - 5} more account(s)</li>` : ""

    this.cannotDeleteBodyTarget.innerHTML = `
      <p class="mb-2">This account type cannot be deleted because it is currently being used by the following account(s):</p>
      <ul class="list-disc pl-5 mb-3 space-y-0.5 text-gray-700 dark:text-gray-300">
        ${names.map(n => `<li>${escapeHtml(n)}</li>`).join("")}
        ${overflow}
      </ul>
      <p>To delete this account type, you must first change those accounts to a different type. If you do not want it available for future use, you can set it to <strong>Inactive</strong> instead.</p>
    `
  }

  closeDeleteModal() {
    this.deleteModalTarget.classList.add("hidden")
    this.deletingId = null
  }

  closeCannotDeleteModal() {
    this.cannotDeleteModalTarget.classList.add("hidden")
  }

  async executeDelete() {
    if (!this.deletingId) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: { "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue }
      })

      if (res.ok) {
        this.closeDeleteModal()
        this.fetchAll()
      } else {
        const data = await res.json()
        this.deleteModalErrorTarget.textContent = (data.errors || ["Delete failed"]).join(", ")
        this.deleteModalErrorTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.deleteModalErrorTarget.textContent = "Network error."
      this.deleteModalErrorTarget.classList.remove("hidden")
    }
  }
}
