import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sunIcon", "moonIcon"]

  connect() {
    this._updateIcons()
  }

  toggle() {
    const isDark = document.documentElement.classList.toggle("dark")
    localStorage.setItem("theme", isDark ? "dark" : "light")
    this._updateIcons()
  }

  _updateIcons() {
    const isDark = document.documentElement.classList.contains("dark")
    if (this.hasSunIconTarget && this.hasMoonIconTarget) {
      this.sunIconTarget.classList.toggle("hidden", !isDark)
      this.moonIconTarget.classList.toggle("hidden", isDark)
    }
  }
}
