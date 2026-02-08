import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "backdrop", "toggleIcon", "mainContent", "tooltip", "flyout"]

  connect() {
    const collapsed = localStorage.getItem("sidebarCollapsed") === "true"
    this._applyState(collapsed, false)
    this._restoreGroupStates()
    // Close flyout on outside click
    this._outsideClickHandler = (e) => {
      if (this.hasFlyoutTarget && !this.flyoutTarget.contains(e.target) && !e.target.closest("[data-group]")) {
        this.hideFlyout()
      }
    }
    document.addEventListener("click", this._outsideClickHandler)
  }

  disconnect() {
    document.removeEventListener("click", this._outsideClickHandler)
  }

  // --- Sidebar collapse ---

  toggle() {
    const isCollapsed = this.sidebarTarget.dataset.collapsed === "true"
    const newState = !isCollapsed
    localStorage.setItem("sidebarCollapsed", newState)
    this._applyState(newState, true)
    this.hideFlyout()
  }

  // --- Group expand/collapse (expanded sidebar) ---

  toggleGroup(event) {
    const btn = event.currentTarget
    const groupKey = btn.dataset.group
    const container = this.sidebarTarget.querySelector(`[data-sidebar-group="${groupKey}"]`)
    const chevron = this.sidebarTarget.querySelector(`[data-sidebar-chevron="${groupKey}"]`)
    if (!container) return

    const isHidden = container.classList.contains("hidden")
    if (isHidden) {
      container.classList.remove("hidden")
      if (chevron) chevron.classList.remove("-rotate-90")
      this._saveGroupState(groupKey, "open")
    } else {
      container.classList.add("hidden")
      if (chevron) chevron.classList.add("-rotate-90")
      this._saveGroupState(groupKey, "closed")
    }
  }

  // --- Group heading click (collapsed = show flyout, expanded = navigate) ---

  handleGroupClick(event) {
    const isCollapsed = this.sidebarTarget.dataset.collapsed === "true"
    if (!isCollapsed) return // let normal navigation happen

    event.preventDefault()
    const anchor = event.currentTarget
    const groupKey = anchor.dataset.group
    const container = this.sidebarTarget.querySelector(`[data-sidebar-group="${groupKey}"]`)
    if (!container) return

    this.hideTooltip()
    this._showFlyout(anchor, groupKey, container)
  }

  // --- Tooltip (collapsed mode only) ---

  showTooltip(event) {
    const isCollapsed = this.sidebarTarget.dataset.collapsed === "true"
    if (!isCollapsed || !this.hasTooltipTarget) return

    const el = event.currentTarget
    const text = el.dataset.tooltip
    if (!text) return

    const tip = this.tooltipTarget
    tip.textContent = text
    tip.classList.remove("hidden")

    const rect = el.getBoundingClientRect()
    tip.style.top = `${rect.top + rect.height / 2}px`
    tip.style.left = `${rect.right + 8}px`
    tip.style.transform = "translateY(-50%)"
  }

  hideTooltip() {
    if (this.hasTooltipTarget) {
      this.tooltipTarget.classList.add("hidden")
    }
  }

  // --- Flyout (collapsed group children) ---

  _showFlyout(anchor, groupKey, childrenContainer) {
    if (!this.hasFlyoutTarget) return
    const flyout = this.flyoutTarget

    // Build flyout content: group heading link + children
    const heading = anchor.dataset.tooltip || ""
    const href = anchor.getAttribute("href")
    let html = `<a href="${href}" class="flex items-center px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">${heading}</a>`
    html += `<div class="border-t border-white/20 mx-2 my-1"></div>`

    childrenContainer.querySelectorAll("a").forEach(link => {
      const label = link.dataset.tooltip || link.textContent.trim()
      html += `<a href="${link.getAttribute("href")}" class="flex items-center px-4 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition">${label}</a>`
    })

    flyout.innerHTML = html
    flyout.classList.remove("hidden")

    // Position to the right of the icon
    const rect = anchor.getBoundingClientRect()
    flyout.style.top = `${rect.top}px`
    flyout.style.left = `${rect.right + 8}px`
  }

  hideFlyout() {
    if (this.hasFlyoutTarget) {
      this.flyoutTarget.classList.add("hidden")
    }
  }

  // --- Mobile ---

  openMobile() {
    this.sidebarTarget.classList.remove("-translate-x-full")
    this.backdropTarget.classList.remove("hidden")
  }

  closeMobile() {
    this.sidebarTarget.classList.add("-translate-x-full")
    this.backdropTarget.classList.add("hidden")
  }

  // --- Internal ---

  _applyState(collapsed, animate) {
    const sidebar = this.sidebarTarget
    sidebar.dataset.collapsed = collapsed

    if (collapsed) {
      sidebar.classList.remove("w-56")
      sidebar.classList.add("w-16")
    } else {
      sidebar.classList.remove("w-16")
      sidebar.classList.add("w-56")
    }

    // Toggle label visibility
    sidebar.querySelectorAll("[data-sidebar-label]").forEach(el => {
      el.classList.toggle("hidden", collapsed)
    })

    // Hide/show group containers when collapsed
    sidebar.querySelectorAll("[data-sidebar-group]").forEach(el => {
      if (collapsed) {
        el.classList.add("hidden")
      } else {
        const groupKey = el.dataset.sidebarGroup
        const saved = this._getGroupState(groupKey)
        if (saved === "closed") {
          el.classList.add("hidden")
        } else {
          el.classList.remove("hidden")
        }
      }
    })

    // Rotate sidebar toggle chevron
    if (this.hasToggleIconTarget) {
      this.toggleIconTarget.classList.toggle("rotate-180", collapsed)
    }

    // Adjust main content margin
    if (this.hasMainContentTarget) {
      if (collapsed) {
        this.mainContentTarget.classList.remove("md:ml-56")
        this.mainContentTarget.classList.add("md:ml-16")
      } else {
        this.mainContentTarget.classList.remove("md:ml-16")
        this.mainContentTarget.classList.add("md:ml-56")
      }
    }
  }

  _restoreGroupStates() {
    const sidebar = this.sidebarTarget
    const isCollapsed = sidebar.dataset.collapsed === "true"
    if (isCollapsed) return

    sidebar.querySelectorAll("[data-sidebar-group]").forEach(container => {
      const groupKey = container.dataset.sidebarGroup
      const chevron = sidebar.querySelector(`[data-sidebar-chevron="${groupKey}"]`)
      const saved = this._getGroupState(groupKey)

      if (saved === "closed") {
        container.classList.add("hidden")
        if (chevron) chevron.classList.add("-rotate-90")
      } else {
        container.classList.remove("hidden")
        if (chevron) chevron.classList.remove("-rotate-90")
      }
    })
  }

  _getGroupState(groupKey) {
    try {
      const states = JSON.parse(localStorage.getItem("sidebarGroups") || "{}")
      return states[groupKey] || "open"
    } catch { return "open" }
  }

  _saveGroupState(groupKey, state) {
    try {
      const states = JSON.parse(localStorage.getItem("sidebarGroups") || "{}")
      states[groupKey] = state
      localStorage.setItem("sidebarGroups", JSON.stringify(states))
    } catch {}
  }
}
