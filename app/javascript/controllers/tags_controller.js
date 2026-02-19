import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

const TAG_COLORS = [
  { key: "blue",   bg: "bg-blue-100 dark:bg-blue-900/40",     text: "text-blue-700 dark:text-blue-300",     dot: "bg-blue-500",   ring: "ring-blue-500",   label: "Blue" },
  { key: "green",  bg: "bg-green-100 dark:bg-green-900/40",   text: "text-green-700 dark:text-green-300",   dot: "bg-green-500",  ring: "ring-green-500",  label: "Green" },
  { key: "gold",   bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500", ring: "ring-yellow-500", label: "Gold" },
  { key: "red",    bg: "bg-red-100 dark:bg-red-900/40",       text: "text-red-700 dark:text-red-300",       dot: "bg-red-500",    ring: "ring-red-500",    label: "Red" },
  { key: "purple", bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500", ring: "ring-purple-500", label: "Purple" },
  { key: "pink",   bg: "bg-pink-100 dark:bg-pink-900/40",     text: "text-pink-700 dark:text-pink-300",     dot: "bg-pink-500",   ring: "ring-pink-500",   label: "Pink" },
  { key: "indigo", bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500", ring: "ring-indigo-500", label: "Indigo" },
  { key: "teal",   bg: "bg-teal-100 dark:bg-teal-900/40",     text: "text-teal-700 dark:text-teal-300",     dot: "bg-teal-500",   ring: "ring-teal-500",   label: "Teal" },
  { key: "orange", bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", ring: "ring-orange-500", label: "Orange" },
  { key: "gray",   bg: "bg-gray-100 dark:bg-gray-700",        text: "text-gray-700 dark:text-gray-300",     dot: "bg-gray-500",   ring: "ring-gray-500",   label: "Gray" },
]

export { TAG_COLORS }

export default class extends Controller {
  static targets = [
    "tableBody", "addButton",
    "deleteModal", "deleteModalName",
    "tagModal", "modalTitle", "modalName", "colorPicker", "modalError"
  ]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.tags = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.selectedColorKey = "blue"
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) this.tags = await res.json()
    } catch (e) {}
    this.renderTable()
  }

  // --- Modal State ---

  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"
    this.selectedColorKey = "blue"
    this.modalTitleTarget.textContent = "Add Tag"
    this.modalNameTarget.value = ""
    this._hideModalError()
    this._renderColorPicker()
    this.tagModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    this.modalNameTarget.focus()
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const tag = this.tags.find(t => t.id === id)
    if (!tag) return

    this.state = "editing"
    this.editingId = id
    this.selectedColorKey = tag.color_key || "blue"
    this.modalTitleTarget.textContent = "Edit Tag"
    this.modalNameTarget.value = tag.name || ""
    this._hideModalError()
    this._renderColorPicker()
    this.tagModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    this.modalNameTarget.focus()
  }

  cancelModal() {
    this.tagModalTarget.classList.add("hidden")
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
    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return }

    try {
      const response = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ tag: { name, color_key: this.selectedColorKey } })
      })

      if (response.ok) {
        const newTag = await response.json()
        this.tags.push(newTag)
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
    if (!name) { this._showModalError("Name is required"); this.modalNameTarget.focus(); return }

    try {
      const response = await fetch(`${this.apiUrlValue}/${this.editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ tag: { name, color_key: this.selectedColorKey } })
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.tags.findIndex(t => t.id === this.editingId)
        if (idx !== -1) this.tags[idx] = updated
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
    const tag = this.tags.find(t => t.id === id)
    if (!tag) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = tag.name
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
        headers: {
          "X-CSRF-Token": this.csrfTokenValue,
          "Accept": "application/json"
        }
      })

      if (response.ok || response.status === 204) {
        this.tags = this.tags.filter(t => t.id !== this.deletingId)
        this.renderTable()
      } else if (response.status === 422) {
        const data = await response.json()
        alert(data.errors?.[0] || "Cannot delete this tag.")
      }
    } catch (e) {}

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Color Picker ---

  selectColor(event) {
    this.selectedColorKey = event.currentTarget.dataset.colorKey
    this._renderColorPicker()
  }

  _renderColorPicker() {
    this.colorPickerTarget.innerHTML = TAG_COLORS.map(c => {
      const selected = c.key === this.selectedColorKey
      const ringClass = selected ? `ring-2 ${c.ring} ring-offset-2` : ""
      return `<button type="button" data-color-key="${c.key}"
        class="w-7 h-7 rounded-full ${c.dot} ${ringClass} hover:ring-2 hover:${c.ring} hover:ring-offset-2 transition"
        data-action="click->tags#selectColor"
        title="${c.label}"></button>`
    }).join("")
  }

  // --- Keyboard & Escape ---

  handleKeydown(event) {
    if (event.key === "Enter") { event.preventDefault(); this.saveModal() }
    else if (event.key === "Escape") { event.preventDefault(); this.cancelModal() }
  }

  _registerModalEscape() {
    this._escHandler = (e) => {
      if (e.key === "Escape") { e.preventDefault(); this.cancelModal() }
    }
    document.addEventListener("keydown", this._escHandler)
  }

  _unregisterModalEscape() {
    if (this._escHandler) {
      document.removeEventListener("keydown", this._escHandler)
      this._escHandler = null
    }
  }

  // --- Error Display ---

  _showModalError(message) {
    this.modalErrorTarget.textContent = message
    this.modalErrorTarget.classList.remove("hidden")
  }

  _hideModalError() {
    this.modalErrorTarget.textContent = ""
    this.modalErrorTarget.classList.add("hidden")
  }

  // --- Rendering ---

  renderTable() {
    let html = ""

    for (const tag of this.tags) {
      html += this._renderRow(tag)
    }

    if (this.tags.length === 0) {
      html = `<tr><td colspan="3" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No tags yet. Click "Add Tag" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  _renderRow(tag) {
    const color = TAG_COLORS.find(c => c.key === tag.color_key) || TAG_COLORS[0]
    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4"><span class="inline-block w-3 h-3 rounded-full ${color.dot}"></span></td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${color.bg} ${color.text}">${escapeHtml(tag.name)}</span>
      </td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${tag.id}"
                data-action="click->tags#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${tag.id}"
                data-action="click->tags#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }
}
