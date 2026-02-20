import { Controller } from "@hotwired/stimulus"
import { ICON_CATALOG, COLOR_OPTIONS, renderIconSvg, defaultIconSvg, iconFor, escapeHtml, escapeAttr } from "controllers/shared/icon_catalog"
import { TAG_COLORS } from "controllers/tags_controller"

export default class extends Controller {
  static targets = [
    "tableBody", "addButton", "generateButton",
    "deleteModal", "deleteModalName",
    "categoryModal", "modalTitle", "modalName", "modalDescription",
    "modalType", "modalDebt", "modalIconPicker", "modalError",
    "modalTagsWrapper", "modalTagsPills", "modalTagsInput", "modalTagsDropdown",
    "limitModal", "limitModalName", "limitModalValue", "limitModalError", "limitModalRemoveBtn"
  ]
  static values = { apiUrl: String, typesUrl: String, limitsUrl: String, csrfToken: String, typesPageUrl: String, tagsUrl: String }

  connect() {
    this.categories = []
    this.spendingTypes = []
    this.allTags = []
    this.selectedTagIds = []
    this._tagsDropdownIndex = -1
    this.state = "idle" // idle | adding | editing
    this.editingId = null
    this.deletingId = null
    this.limits = {}
    this.limitScopeId = null
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false
    this.fetchAll()

    // Close icon picker when clicking outside
    this._onDocumentClick = (e) => {
      if (this.iconPickerOpen && !e.target.closest("[data-icon-picker]")) {
        this.iconPickerOpen = false
        this._rerenderIconPicker()
      }
      // Close tags dropdown when clicking outside
      if (this.hasModalTagsWrapperTarget && !this.modalTagsWrapperTarget.contains(e.target)) {
        this._hideTagsDropdown()
      }
    }
    document.addEventListener("click", this._onDocumentClick)
  }

  disconnect() {
    document.removeEventListener("click", this._onDocumentClick)
    this._unregisterModalEscape()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const fetches = [
        fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } }),
        fetch(this.typesUrlValue, { headers: { "Accept": "application/json" } })
      ]
      if (this.tagsUrlValue) {
        fetches.push(fetch(this.tagsUrlValue, { headers: { "Accept": "application/json" } }))
      }
      const results = await Promise.all(fetches)
      if (results[0].ok) this.categories = await results[0].json()
      if (results[1].ok) this.spendingTypes = await results[1].json()
      if (results[2] && results[2].ok) this.allTags = await results[2].json()
    } catch (e) {
      // silently fail, show empty table
    }
    await this._fetchLimits()
    this.renderTable()
  }

  async _fetchLimits() {
    if (!this.limitsUrlValue) return
    try {
      const yyyymm = this._currentYYYYMM()
      const res = await fetch(`${this.limitsUrlValue}?scope_type=CATEGORY&yyyymm=${yyyymm}`, {
        headers: { "Accept": "application/json" }
      })
      if (res.ok) {
        this.limits = await res.json()
      }
    } catch (e) {
      this.limits = {}
    }
  }

  _currentYYYYMM() {
    const now = new Date()
    return now.getFullYear() * 100 + (now.getMonth() + 1)
  }

  // --- Generate Data ---

  async generateData() {
    if (this.state !== "idle") return
    if (this.spendingTypes.length === 0) {
      alert("Please generate Spending Types first before generating categories.")
      return
    }

    const btn = this.generateButtonTarget
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generating...`
    this.addButtonTarget.disabled = true

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

    const dummyData = [
      { name: "Groceries", description: "Supermarket and food shopping", is_debt: false, icon_key: "shopping-bag", color_key: "green" },
      { name: "Gas", description: "Fuel for vehicles", is_debt: false, icon_key: "car", color_key: "gold" },
      { name: "Netflix", description: "Streaming subscription", is_debt: false, icon_key: "film", color_key: "red" },
      { name: "Rent", description: "Monthly rent payment", is_debt: false, icon_key: "home", color_key: "blue" },
      { name: "Doctor Visit", description: "Medical appointments", is_debt: false, icon_key: "medical", color_key: "pink" },
      { name: "Student Loan", description: "Education loan payment", is_debt: true, icon_key: "academic", color_key: "indigo" },
      { name: "Credit Card Payment", description: "Monthly credit card bill", is_debt: true, icon_key: "receipt", color_key: "red" },
      { name: "Electric Bill", description: "Monthly electricity", is_debt: false, icon_key: "lightning", color_key: "orange" },
      { name: "Gym Membership", description: "Monthly gym fee", is_debt: false, icon_key: "heart", color_key: "teal" },
      { name: "Clothing", description: "Apparel and accessories", is_debt: false, icon_key: "shopping-bag", color_key: "purple" }
    ]

    for (const item of dummyData) {
      const type = pick(this.spendingTypes)
      try {
        const response = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ spending_category: { ...item, spending_type_id: type.id } })
        })
        if (response.ok) {
          const newCat = await response.json()
          this.categories.push(newCat)
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

  // --- Modal State Transitions ---

  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"
    this.selectedIconKey = null
    this.selectedColorKey = "blue"
    this.iconPickerOpen = false

    this.modalTitleTarget.textContent = "Add Spending Category"
    this.modalNameTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this._rebuildTypeDropdown()
    this._setModalDebt(false)
    this._updateModalIconPreview()
    this._hideModalError()
    this.selectedTagIds = []
    this.modalTagsInputTarget.value = ""
    this._renderTagPills()
    this._hideTagsDropdown()
    this.categoryModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    this.modalNameTarget.focus()
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const cat = this.categories.find(c => c.id === id)
    if (!cat) return

    this.state = "editing"
    this.editingId = id
    this.selectedIconKey = cat.icon_key || null
    this.selectedColorKey = cat.color_key || "blue"
    this.iconPickerOpen = false

    this.modalTitleTarget.textContent = "Edit Spending Category"
    this.modalNameTarget.value = cat.name || ""
    this.modalDescriptionTarget.value = cat.description || ""
    this._rebuildTypeDropdown(cat.spending_type_id)
    this._setModalDebt(cat.is_debt)
    this._updateModalIconPreview()
    this._hideModalError()
    this.selectedTagIds = [...(cat.default_tag_ids || [])]
    this.modalTagsInputTarget.value = ""
    this._renderTagPills()
    this._hideTagsDropdown()
    this.categoryModalTarget.classList.remove("hidden")
    this._registerModalEscape()
    this.modalNameTarget.focus()
  }

  cancelModal() {
    this.categoryModalTarget.classList.add("hidden")
    this.state = "idle"
    this.editingId = null
    this.iconPickerOpen = false
    this._hideTagsDropdown()
    this._unregisterModalEscape()
  }

  saveModal() {
    if (this.state === "adding") this.saveNew()
    else if (this.state === "editing") this.saveEdit()
  }

  async saveNew() {
    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()
    const spending_type_id = this.modalTypeTarget.value
    const is_debt = this._getModalDebt()

    if (!name) {
      this._showModalError("Name is required")
      this.modalNameTarget.focus()
      return
    }
    if (!spending_type_id || spending_type_id === "new") {
      this._showModalError("Spending Type is required — select an existing type or refresh after creating one")
      this.modalTypeTarget.focus()
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
        body: JSON.stringify({ spending_category: {
          name, description, spending_type_id, is_debt,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey,
          tag_ids: this.selectedTagIds
        }})
      })

      if (response.ok) {
        const newCat = await response.json()
        this.categories.push(newCat)
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
    const spending_type_id = this.modalTypeTarget.value
    const is_debt = this._getModalDebt()

    if (!name) {
      this._showModalError("Name is required")
      this.modalNameTarget.focus()
      return
    }
    if (!spending_type_id || spending_type_id === "new") {
      this._showModalError("Spending Type is required — select an existing type or refresh after creating one")
      this.modalTypeTarget.focus()
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
        body: JSON.stringify({ spending_category: {
          name, description, spending_type_id, is_debt,
          icon_key: this.selectedIconKey,
          color_key: this.selectedColorKey,
          tag_ids: this.selectedTagIds
        }})
      })

      if (response.ok) {
        const updated = await response.json()
        const idx = this.categories.findIndex(c => c.id === this.editingId)
        if (idx !== -1) this.categories[idx] = updated
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
    const cat = this.categories.find(c => c.id === id)
    if (!cat) return

    this.deletingId = id
    this.deleteModalNameTarget.textContent = cat.name
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
        this.categories = this.categories.filter(c => c.id !== this.deletingId)
        this.renderTable()
      } else if (response.status === 422) {
        const data = await response.json()
        alert(data.errors?.[0] || "Cannot delete this category.")
      }
    } catch (e) {
      // silently fail
    }

    this.deletingId = null
    this.deleteModalTarget.classList.add("hidden")
    this.addButtonTarget.disabled = false
  }

  // --- Icon Picker ---

  toggleIconPicker(event) {
    event.stopPropagation()
    this.iconPickerOpen = !this.iconPickerOpen
    this._rerenderIconPicker()
  }

  selectIcon(event) {
    event.stopPropagation()
    const key = event.currentTarget.dataset.iconKey
    if (key) {
      this.selectedIconKey = key
      this.iconPickerOpen = false
      this._rerenderIconPicker()
      this._updateModalIconPreview()
    }
  }

  selectColor(event) {
    event.stopPropagation()
    const key = event.currentTarget.dataset.colorKey
    if (key) {
      this.selectedColorKey = key
      this._rerenderIconPicker()
      this._updateModalIconPreview()
    }
  }

  _rerenderIconPicker() {
    const container = this.hasModalIconPickerTarget ? this.modalIconPickerTarget : this.element
    const dropdown = container.querySelector("[data-icon-picker-dropdown]")
    if (!dropdown) return

    if (!this.iconPickerOpen) {
      dropdown.classList.add("hidden")
      return
    }

    dropdown.classList.remove("hidden")
    dropdown.innerHTML = this._renderIconPickerContent()

    const btn = dropdown.closest("[data-icon-picker]")?.querySelector("button")
    if (btn) {
      const rect = btn.getBoundingClientRect()
      dropdown.style.left = `${rect.left}px`
      dropdown.style.top = `${rect.bottom + 4}px`
    }
  }

  _updateModalIconPreview() {
    const container = this.hasModalIconPickerTarget ? this.modalIconPickerTarget : this.element
    const preview = container.querySelector("[data-icon-preview]")
    if (preview) {
      preview.innerHTML = this.selectedIconKey
        ? renderIconSvg(this.selectedIconKey, this.selectedColorKey, "h-5 w-5")
        : `<svg class="h-5 w-5 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
    }
  }

  _renderIconPickerContent() {
    const colorHtml = COLOR_OPTIONS.map(c => {
      const selected = c.key === this.selectedColorKey
      const ringClass = selected ? `ring-2 ${c.ring} ring-offset-1` : ""
      return `<button type="button" data-color-key="${c.key}"
        class="w-6 h-6 rounded-full ${c.bg} ${ringClass} hover:ring-2 hover:${c.ring} hover:ring-offset-1 transition flex items-center justify-center"
        data-action="click->spending-categories#selectColor"
        title="${c.label}">
        <span class="w-3 h-3 rounded-full ${c.css.replace('text-', 'bg-')}"></span>
      </button>`
    }).join("")

    const iconsHtml = ICON_CATALOG.map(icon => {
      const selected = icon.key === this.selectedIconKey
      const bgClass = selected ? "bg-brand-100 dark:bg-brand-900/40 ring-2 ring-brand-500" : "hover:bg-gray-100 dark:hover:bg-gray-700"
      return `<button type="button" data-icon-key="${icon.key}"
        class="p-1.5 rounded-md ${bgClass} transition flex items-center justify-center"
        data-action="click->spending-categories#selectIcon"
        title="${icon.label}">
        ${renderIconSvg(icon.key, this.selectedColorKey, "h-5 w-5")}
      </button>`
    }).join("")

    return `
      <div class="p-3 border-b border-gray-200 dark:border-gray-700">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Color</p>
        <div class="flex gap-1.5 flex-wrap">${colorHtml}</div>
      </div>
      <div class="p-3">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Icon</p>
        <div class="grid grid-cols-8 gap-1">${iconsHtml}</div>
      </div>`
  }

  // --- Tags Multi-Select ---

  onTagsFocus() {
    this._showTagsDropdown()
  }

  onTagsInput() {
    this._tagsDropdownIndex = -1
    this._showTagsDropdown()
  }

  onTagsKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      this._hideTagsDropdown()
      return
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      this._tagsDropdownIndex++
      this._showTagsDropdown()
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      this._tagsDropdownIndex = Math.max(-1, this._tagsDropdownIndex - 1)
      this._showTagsDropdown()
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      const items = this._getFilteredTagItems()
      if (this._tagsDropdownIndex >= 0 && this._tagsDropdownIndex < items.length) {
        const item = items[this._tagsDropdownIndex]
        if (item.isCreate) {
          this._quickCreateTag(item.name)
        } else {
          this._toggleTagSelection(item.id)
        }
      } else if (items.length === 1 && items[0].isCreate) {
        this._quickCreateTag(items[0].name)
      }
      return
    }
    if (event.key === "Backspace" && !this.modalTagsInputTarget.value && this.selectedTagIds.length > 0) {
      this.selectedTagIds.pop()
      this._renderTagPills()
      this._showTagsDropdown()
    }
  }

  _getFilteredTagItems() {
    const query = this.modalTagsInputTarget.value.trim().toLowerCase()
    let items = this.allTags
      .filter(t => !query || t.name.toLowerCase().includes(query))
      .map(t => ({ id: t.id, name: t.name, color_key: t.color_key, selected: this.selectedTagIds.includes(t.id) }))

    if (query && !this.allTags.some(t => t.name.toLowerCase() === query)) {
      items.push({ isCreate: true, name: this.modalTagsInputTarget.value.trim() })
    }
    return items
  }

  _showTagsDropdown() {
    const items = this._getFilteredTagItems()
    if (items.length === 0) { this._hideTagsDropdown(); return }

    if (this._tagsDropdownIndex >= items.length) this._tagsDropdownIndex = items.length - 1

    let html = ""
    items.forEach((item, i) => {
      const active = i === this._tagsDropdownIndex ? "bg-brand-50 dark:bg-brand-900/30" : ""
      if (item.isCreate) {
        html += `<div class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${active} text-brand-600 dark:text-brand-400 font-medium"
                      data-action="click->spending-categories#quickCreateTagClick" data-name="${escapeAttr(item.name)}">
          + Create "${escapeHtml(item.name)}"
        </div>`
      } else {
        const c = TAG_COLORS.find(tc => tc.key === item.color_key) || TAG_COLORS[0]
        const checkmark = item.selected ? `<svg class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>` : `<span class="w-4"></span>`
        html += `<div class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${active} flex items-center gap-2"
                      data-action="click->spending-categories#toggleTagClick" data-tag-id="${item.id}">
          ${checkmark}
          <span class="w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0"></span>
          <span>${escapeHtml(item.name)}</span>
        </div>`
      }
    })

    this.modalTagsDropdownTarget.innerHTML = html
    this.modalTagsDropdownTarget.classList.remove("hidden")
  }

  _hideTagsDropdown() {
    if (this.hasModalTagsDropdownTarget) {
      this.modalTagsDropdownTarget.classList.add("hidden")
    }
    this._tagsDropdownIndex = -1
  }

  toggleTagClick(event) {
    const tagId = Number(event.currentTarget.dataset.tagId)
    this._toggleTagSelection(tagId)
  }

  _toggleTagSelection(tagId) {
    const idx = this.selectedTagIds.indexOf(tagId)
    if (idx >= 0) {
      this.selectedTagIds.splice(idx, 1)
    } else {
      this.selectedTagIds.push(tagId)
    }
    this._renderTagPills()
    this._showTagsDropdown()
  }

  removeTag(event) {
    const tagId = Number(event.currentTarget.dataset.tagId)
    this.selectedTagIds = this.selectedTagIds.filter(id => id !== tagId)
    this._renderTagPills()
    if (this.hasModalTagsDropdownTarget && !this.modalTagsDropdownTarget.classList.contains("hidden")) {
      this._showTagsDropdown()
    }
  }

  _renderTagPills() {
    const html = this.selectedTagIds.map(id => {
      const tag = this.allTags.find(t => t.id === id)
      if (!tag) return ""
      const c = TAG_COLORS.find(tc => tc.key === tag.color_key) || TAG_COLORS[0]
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}">
        ${escapeHtml(tag.name)}
        <button type="button" class="hover:opacity-70" data-tag-id="${tag.id}" data-action="click->spending-categories#removeTag">&times;</button>
      </span>`
    }).join("")
    this.modalTagsPillsTarget.innerHTML = html
  }

  async quickCreateTagClick(event) {
    const name = event.currentTarget.dataset.name
    await this._quickCreateTag(name)
  }

  async _quickCreateTag(name) {
    if (!this.tagsUrlValue) return
    try {
      const response = await fetch(this.tagsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ tag: { name, color_key: "blue" } })
      })
      if (response.ok) {
        const newTag = await response.json()
        this.allTags.push(newTag)
        this.selectedTagIds.push(newTag.id)
        this.modalTagsInputTarget.value = ""
        this._renderTagPills()
        this._showTagsDropdown()
      } else {
        const data = await response.json()
        this._showModalError(data.errors?.[0] || "Failed to create tag")
      }
    } catch (e) {
      this._showModalError("Network error creating tag")
    }
  }

  // --- Debt Toggle ---

  toggleDebt(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Debt: Yes" : "Debt: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-brand-600", nowOn ? "bg-brand-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    // If in display mode (has data-id), persist to server
    const catId = btn.dataset.id
    if (catId && this.state === "idle") {
      this._persistDebtToggle(btn, catId, wasOn, nowOn)
    }
  }

  async _persistDebtToggle(btn, catId, wasOn, nowOn) {
    try {
      const response = await fetch(`${this.apiUrlValue}/${catId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ spending_category: { is_debt: nowOn } })
      })
      if (response.ok) {
        const updated = await response.json()
        const idx = this.categories.findIndex(c => c.id === Number(catId))
        if (idx !== -1) this.categories[idx] = updated
      }
    } catch (e) {
      // Revert on error
      btn.dataset.checked = String(wasOn)
      btn.setAttribute("aria-checked", String(wasOn))
      btn.title = wasOn ? "Debt: Yes" : "Debt: No"
      btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-brand-600", wasOn ? "bg-brand-600" : "bg-gray-300")
      const knob = btn.querySelector("span")
      knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
    }
  }

  _setModalDebt(isOn) {
    const btn = this.modalDebtTarget.querySelector(".debt-toggle")
    if (!btn) return
    btn.dataset.checked = String(isOn)
    btn.setAttribute("aria-checked", String(isOn))
    btn.title = isOn ? "Debt: Yes" : "Debt: No"
    btn.className = btn.className.replace(isOn ? "bg-gray-300" : "bg-brand-600", isOn ? "bg-brand-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(isOn ? "translate-x-1" : "translate-x-7", isOn ? "translate-x-7" : "translate-x-1")
  }

  _getModalDebt() {
    const btn = this.modalDebtTarget.querySelector(".debt-toggle")
    return btn?.dataset.checked === "true"
  }

  // --- Dropdown Helpers ---

  _rebuildTypeDropdown(selectedId = null) {
    let html = `<option value="">Select type...</option><option value="new">&mdash; New Spending Type &mdash;</option>`
    for (const st of this.spendingTypes) {
      const sel = st.id === selectedId ? "selected" : ""
      html += `<option value="${st.id}" ${sel}>${escapeHtml(st.name)}</option>`
    }
    this.modalTypeTarget.innerHTML = html
  }

  handleNewDropdown(event) {
    if (event.target.value !== "new") return
    if (this.hasTypesPageUrlValue) this._openInNewTab(this.typesPageUrlValue)
  }

  _openInNewTab(url) {
    const a = document.createElement("a")
    a.href = url
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // --- Keyboard & Escape ---

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.saveModal()
    } else if (event.key === "Escape") {
      event.preventDefault()
      if (this.iconPickerOpen) {
        this.iconPickerOpen = false
        this._rerenderIconPicker()
      } else {
        this.cancelModal()
      }
    }
  }

  _registerModalEscape() {
    this._escHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (this.iconPickerOpen) {
          this.iconPickerOpen = false
          this._rerenderIconPicker()
        } else {
          this.cancelModal()
        }
      }
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

    for (const cat of this.categories) {
      html += this.renderDisplayRow(cat)
    }

    if (this.categories.length === 0) {
      html = `<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No spending categories yet. Click "Add Spending Category" to create one.</td></tr>`
    }

    this.tableBodyTarget.innerHTML = html
  }

  renderDisplayRow(cat) {
    const debtToggle = this._renderDebtToggle(cat.is_debt, cat.id)

    const limit = this.limits[String(cat.id)]
    const limitHtml = limit
      ? `<span class="text-sm font-semibold text-green-600 dark:text-green-400">$${parseFloat(limit.limit_value).toFixed(2)}</span>
         <button type="button" class="ml-1 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                 data-id="${cat.id}" data-action="click->spending-categories#startSettingLimit" title="Edit limit">
           <svg class="h-3.5 w-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
         </button>`
      : `<button type="button" class="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                 data-id="${cat.id}" data-action="click->spending-categories#startSettingLimit">Set</button>`

    // Render default tag pills for this category
    const tagPills = this._renderRowTagPills(cat.default_tag_ids || [])

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4">${iconFor(cat.icon_key, cat.color_key)}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(cat.name)}</td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        ${escapeHtml(cat.description || "")}
        ${tagPills}
      </td>
      <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 w-48 max-w-[12rem] truncate">${escapeHtml(cat.spending_type_name || "")}</td>
      <td class="px-6 py-4 text-center">${debtToggle}</td>
      <td class="px-6 py-4 text-center">${limitHtml}</td>
      <td class="px-6 py-4 text-right space-x-2">
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-800 transition"
                data-id="${cat.id}"
                data-action="click->spending-categories#startEditing"
                title="Edit">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                data-id="${cat.id}"
                data-action="click->spending-categories#confirmDelete"
                title="Delete">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>`
  }

  _renderRowTagPills(tagIds) {
    if (!tagIds || tagIds.length === 0) return ""
    const pills = tagIds.map(id => {
      const tag = this.allTags.find(t => t.id === id)
      if (!tag) return ""
      const c = TAG_COLORS.find(tc => tc.key === tag.color_key) || TAG_COLORS[0]
      return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}">${escapeHtml(tag.name)}</span>`
    }).filter(Boolean).join("")
    return pills ? `<div class="flex flex-wrap gap-1 mt-1">${pills}</div>` : ""
  }

  // --- Limit Modal ---

  startSettingLimit(event) {
    const id = Number(event.currentTarget.dataset.id)
    const cat = this.categories.find(c => c.id === id)
    if (!cat) return

    this.limitScopeId = id
    this.limitModalNameTarget.textContent = cat.name
    const existing = this.limits[String(id)]
    this.limitModalValueTarget.value = existing ? existing.limit_value : ""
    this.limitModalErrorTarget.classList.add("hidden")

    if (existing) {
      this.limitModalRemoveBtnTarget.classList.remove("hidden")
    } else {
      this.limitModalRemoveBtnTarget.classList.add("hidden")
    }

    this.limitModalTarget.classList.remove("hidden")
    this.limitModalValueTarget.focus()
  }

  closeLimitModal() {
    this.limitModalTarget.classList.add("hidden")
    this.limitScopeId = null
  }

  handleLimitKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.saveLimitModal()
    } else if (event.key === "Escape") {
      event.preventDefault()
      this.closeLimitModal()
    }
  }

  async saveLimitModal() {
    const value = parseFloat(this.limitModalValueTarget.value)
    if (isNaN(value) || value <= 0) {
      this.limitModalErrorTarget.textContent = "Enter a value greater than 0"
      this.limitModalErrorTarget.classList.remove("hidden")
      return
    }

    try {
      const res = await fetch(this.limitsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ spending_limit: {
          scope_type: "CATEGORY",
          scope_id: this.limitScopeId,
          limit_value: value
        }})
      })

      if (res.ok) {
        this.closeLimitModal()
        await this._fetchLimits()
        this.renderTable()
      } else {
        const data = await res.json()
        this.limitModalErrorTarget.textContent = (data.errors || ["Save failed"]).join(", ")
        this.limitModalErrorTarget.classList.remove("hidden")
      }
    } catch (e) {
      this.limitModalErrorTarget.textContent = "Network error"
      this.limitModalErrorTarget.classList.remove("hidden")
    }
  }

  async removeLimitModal() {
    const existing = this.limits[String(this.limitScopeId)]
    if (!existing) return

    try {
      const res = await fetch(`${this.limitsUrlValue}/${existing.id}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": this.csrfTokenValue,
          "Accept": "application/json"
        }
      })

      if (res.ok || res.status === 204) {
        this.closeLimitModal()
        await this._fetchLimits()
        this.renderTable()
      }
    } catch (e) {
      // silently fail
    }
  }

  _renderDebtToggle(isOn, catId = null) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    const dataId = catId ? `data-id="${catId}"` : ""
    return `<button type="button"
      class="debt-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isOn}" ${dataId}
      data-action="click->spending-categories#toggleDebt"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Debt: Yes' : 'Debt: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }
}
