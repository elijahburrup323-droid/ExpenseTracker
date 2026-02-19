import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, renderIconSvg, escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tableBody", "slotCount",
    "modal", "modalTitle", "modalTitleInput", "modalReportKey", "modalCategory",
    "modalDescription", "modalRoutePath", "modalSlot", "iconGrid", "modalIconKey",
    "modalAccentStyle", "modalError",
    "deleteModal", "deleteModalName", "deleteModalInUse", "deleteModalError"
  ]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.masters = []
    this.slotsData = []
    this.editingId = null
    this.deletingId = null
    this.selectedIconKey = null
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const [mastersRes, slotsRes] = await Promise.all([
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(`${this.apiUrlValue}/slots`, { headers: { "Accept": "application/json" } })
      ])
      if (mastersRes.ok) this.masters = await mastersRes.json()
      if (slotsRes.ok) {
        const data = await slotsRes.json()
        this.slotsData = data.slots || []
      }
      this.renderTable()
      this.updateSlotCount()
    } catch (e) {
      console.error("Failed to load reports masters:", e)
    }
  }

  updateSlotCount() {
    if (this.hasSlotCountTarget) {
      this.slotCountTarget.textContent = this.slotsData.length
    }
  }

  renderTable() {
    if (this.masters.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No reports defined. Click "+ Add Report" to create one.</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = this.masters.map(m => {
      const iconHtml = m.icon_key
        ? renderIconSvg(m.icon_key, "blue", "h-5 w-5")
        : `<span class="text-gray-300 text-xs">—</span>`

      const slotBadge = m.assigned_slot
        ? `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">${m.assigned_slot}</span>`
        : `<span class="text-gray-300 text-xs">—</span>`

      const bg = m.is_active ? "bg-green-600" : "bg-gray-300"
      const knobTranslate = m.is_active ? "translate-x-7" : "translate-x-1"
      const activeToggle = `<button type="button"
        class="relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-green-300"
        data-id="${m.id}" data-checked="${m.is_active}"
        data-action="click->reports-masters#toggleActive"
        role="switch" aria-checked="${m.is_active}" title="${m.is_active ? 'Active' : 'Inactive'}">
        <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
      </button>`

      return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-4 py-3 text-center">${iconHtml}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(m.title)}</td>
        <td class="px-4 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">${escapeHtml(m.category)}</span></td>
        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[14rem] truncate hidden md:table-cell" title="${escapeHtml(m.description || '')}">${escapeHtml(m.description || "")}</td>
        <td class="px-4 py-3 text-center">${slotBadge}</td>
        <td class="px-4 py-3 text-center">${activeToggle}</td>
        <td class="px-4 py-3 text-center space-x-2 whitespace-nowrap">
          <button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                  data-id="${m.id}" data-action="click->reports-masters#openEditModal" title="Edit">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                  data-id="${m.id}" data-action="click->reports-masters#confirmDelete" title="Deactivate">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      </tr>`
    }).join("")
  }

  // --- Icon Grid ---

  _renderIconGrid(selectedKey) {
    if (!this.hasIconGridTarget) return
    this.iconGridTarget.innerHTML = ICON_CATALOG.map(icon => {
      const isSelected = icon.key === selectedKey
      const ring = isSelected ? "ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-700"
      return `<button type="button"
        class="flex items-center justify-center w-8 h-8 rounded-md transition ${ring}"
        data-icon-key="${icon.key}" data-action="click->reports-masters#selectIcon" title="${icon.label}">
        ${renderIconSvg(icon.key, isSelected ? "blue" : "gray", "h-4 w-4")}
      </button>`
    }).join("")
  }

  selectIcon(event) {
    const btn = event.currentTarget
    this.selectedIconKey = btn.dataset.iconKey
    if (this.hasModalIconKeyTarget) this.modalIconKeyTarget.value = this.selectedIconKey
    this._renderIconGrid(this.selectedIconKey)
  }

  // --- Route Path Dropdown ---

  _resetRoutePathDropdown(currentPath) {
    const select = this.modalRoutePathTarget
    // Remove any previously injected legacy option
    const legacy = select.querySelector('option[data-legacy]')
    if (legacy) legacy.remove()

    // Check if currentPath exists in the dropdown options
    if (currentPath && !Array.from(select.options).some(o => o.value === currentPath)) {
      // Inject a legacy/invalid option so the user sees the current value
      const opt = document.createElement("option")
      opt.value = currentPath
      opt.textContent = `Invalid/Legacy Route — ${currentPath}`
      opt.dataset.legacy = "true"
      opt.className = "text-red-600"
      select.insertBefore(opt, select.options[1]) // after "None (Coming Soon)"
    }

    select.value = currentPath
  }

  // --- Slot Dropdown ---

  _populateSlotDropdown(currentSlot, currentReportKey) {
    if (!this.hasModalSlotTarget) return
    let html = `<option value="">Unassigned</option>`
    this.slotsData.forEach(slot => {
      const occupied = slot.report_key && slot.report_key !== currentReportKey
      const label = occupied
        ? `Slot ${slot.slot_number} (${slot.report_title})`
        : `Slot ${slot.slot_number}`
      const selected = slot.slot_number === currentSlot ? " selected" : ""
      const disabled = occupied ? " disabled" : ""
      html += `<option value="${slot.slot_number}"${selected}${disabled}>${label}</option>`
    })
    this.modalSlotTarget.innerHTML = html
  }

  // --- Modal ---

  openAddModal() {
    this.editingId = null
    this.selectedIconKey = null
    this.modalTitleTarget.textContent = "Add Report"
    this.modalTitleInputTarget.value = ""
    this.modalReportKeyTarget.value = ""
    this.modalReportKeyTarget.readOnly = false
    this.modalReportKeyTarget.classList.remove("bg-gray-100", "dark:bg-gray-600")
    this.modalCategoryTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this._resetRoutePathDropdown("")
    this.modalAccentStyleTarget.value = "brand"
    this.modalIconKeyTarget.value = ""
    this.modalErrorTarget.classList.add("hidden")
    this._renderIconGrid(null)
    this._populateSlotDropdown(null, null)
    this.modalTarget.classList.remove("hidden")
    this.modalTitleInputTarget.focus()
  }

  openEditModal(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    this.editingId = id
    this.selectedIconKey = master.icon_key
    this.modalTitleTarget.textContent = "Edit Report"
    this.modalTitleInputTarget.value = master.title
    this.modalReportKeyTarget.value = master.report_key
    this.modalReportKeyTarget.readOnly = true
    this.modalReportKeyTarget.classList.add("bg-gray-100", "dark:bg-gray-600")
    this.modalCategoryTarget.value = master.category
    this.modalDescriptionTarget.value = master.description || ""
    this._resetRoutePathDropdown(master.route_path || "")
    this.modalAccentStyleTarget.value = master.accent_style || "brand"
    this.modalIconKeyTarget.value = master.icon_key || ""
    this.modalErrorTarget.classList.add("hidden")
    this._renderIconGrid(master.icon_key)
    this._populateSlotDropdown(master.assigned_slot, master.report_key)
    this.modalTarget.classList.remove("hidden")
    this.modalTitleInputTarget.focus()
  }

  closeModal() {
    this.modalTarget.classList.add("hidden")
    this.editingId = null
  }

  modalKeydown(event) {
    if (event.key === "Escape") { this.closeModal() }
  }

  async saveModal() {
    const title = this.modalTitleInputTarget.value.trim()
    const report_key = this.modalReportKeyTarget.value.trim()
    const category = this.modalCategoryTarget.value.trim()

    if (!title) { this._showModalError("Title is required."); return }
    if (!report_key) { this._showModalError("Report Key is required."); return }
    if (!category) { this._showModalError("Category is required."); return }

    // Reject legacy/invalid route paths
    const selectedRouteOption = this.modalRoutePathTarget.selectedOptions[0]
    if (selectedRouteOption && selectedRouteOption.dataset.legacy) {
      this._showModalError("Route path is invalid. Please select a registered route or 'None'.")
      return
    }

    const body = {
      reports_master: {
        title,
        report_key: this.editingId ? undefined : report_key,
        category,
        description: this.modalDescriptionTarget.value.trim() || null,
        route_path: this.modalRoutePathTarget.value.trim() || null,
        icon_key: this.modalIconKeyTarget.value || null,
        accent_style: this.modalAccentStyleTarget.value || "brand",
        is_active: true
      },
      slot_number: this.modalSlotTarget.value || null
    }

    // Remove undefined keys
    Object.keys(body.reports_master).forEach(k => {
      if (body.reports_master[k] === undefined) delete body.reports_master[k]
    })

    const url = this.editingId ? `${this.apiUrlValue}/${this.editingId}` : this.apiUrlValue
    const method = this.editingId ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        this.closeModal()
        this.fetchAll()
      } else {
        const data = await res.json()
        this._showModalError((data.errors || ["Save failed"]).join(", "))
      }
    } catch (e) {
      this._showModalError("Network error.")
    }
  }

  _showModalError(msg) {
    this.modalErrorTarget.textContent = msg
    this.modalErrorTarget.classList.remove("hidden")
  }

  // --- Active Toggle ---

  async toggleActive(event) {
    const btn = event.currentTarget
    const id = parseInt(btn.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    const wasOn = master.is_active
    const nowOn = !wasOn

    // Optimistic UI
    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Active" : "Inactive"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-green-600", nowOn ? "bg-green-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    try {
      const res = await fetch(`${this.apiUrlValue}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ reports_master: { is_active: nowOn } })
      })
      if (res.ok) {
        master.is_active = nowOn
      } else {
        this._revertToggle(btn, knob, wasOn)
      }
    } catch (e) {
      this._revertToggle(btn, knob, wasOn)
    }
  }

  _revertToggle(btn, knob, wasOn) {
    btn.dataset.checked = String(wasOn)
    btn.setAttribute("aria-checked", String(wasOn))
    btn.title = wasOn ? "Active" : "Inactive"
    btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-green-600", wasOn ? "bg-green-600" : "bg-gray-300")
    knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
  }

  // --- Delete ---

  async confirmDelete(event) {
    const id = parseInt(event.currentTarget.dataset.id)
    const master = this.masters.find(m => m.id === id)
    if (!master) return

    // Check usage
    try {
      const res = await fetch(`${this.apiUrlValue}/${id}/can_delete`, { headers: { "Accept": "application/json" } })
      const data = await res.json()
      if (data.in_use_count > 0) {
        this.deleteModalInUseTarget.textContent = `This report is in ${data.in_use_count} user layout(s). It will be deactivated and unassigned from its slot.`
      } else {
        this.deleteModalInUseTarget.textContent = "This will deactivate the report and remove its slot assignment."
      }
    } catch (e) {
      this.deleteModalInUseTarget.textContent = "This will deactivate the report."
    }

    this.deletingId = id
    this.deleteModalNameTarget.textContent = master.title
    this.deleteModalErrorTarget.classList.add("hidden")
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

  // --- Add Slot ---

  async addSlot() {
    try {
      const res = await fetch(`${this.apiUrlValue}/add_slot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        }
      })
      if (res.ok) {
        this.fetchAll()
      }
    } catch (e) {
      console.error("Failed to add slot:", e)
    }
  }
}
