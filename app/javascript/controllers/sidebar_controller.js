import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "backdrop", "toggleIcon", "mainContent"]

  connect() {
    const collapsed = localStorage.getItem("sidebarCollapsed") === "true"
    this._applyState(collapsed, false)
  }

  toggle() {
    const isCollapsed = this.sidebarTarget.dataset.collapsed === "true"
    const newState = !isCollapsed
    localStorage.setItem("sidebarCollapsed", newState)
    this._applyState(newState, true)
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
}
