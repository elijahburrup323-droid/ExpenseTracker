import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "backdrop", "toggleIcon", "mainContent"]

  connect() {
    const collapsed = localStorage.getItem("sidebarCollapsed") === "true"
    this._applyState(collapsed, false)
    this._restoreGroupStates()
  }

  toggle() {
    const isCollapsed = this.sidebarTarget.dataset.collapsed === "true"
    const newState = !isCollapsed
    localStorage.setItem("sidebarCollapsed", newState)
    this._applyState(newState, true)
  }

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

  openMobile() {
    this.sidebarTarget.classList.remove("-translate-x-full")
    this.backdropTarget.classList.remove("hidden")
  }

  closeMobile() {
    this.sidebarTarget.classList.add("-translate-x-full")
    this.backdropTarget.classList.add("hidden")
  }

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

    // Toggle tooltip visibility (show tooltips only when collapsed)
    sidebar.querySelectorAll("[data-sidebar-tooltip]").forEach(el => {
      if (collapsed) {
        el.style.display = ""
      } else {
        el.style.display = "none"
      }
    })

    // Hide/show group containers when collapsed
    sidebar.querySelectorAll("[data-sidebar-group]").forEach(el => {
      if (collapsed) {
        el.classList.add("hidden")
      } else {
        // Restore from saved state
        const groupKey = el.dataset.sidebarGroup
        const saved = this._getGroupState(groupKey)
        if (saved === "closed") {
          el.classList.add("hidden")
        } else {
          el.classList.remove("hidden")
        }
      }
    })

    // Rotate toggle chevron
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
    if (isCollapsed) return // groups hidden when sidebar collapsed

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
