import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["themeGrid", "saveBtn", "status", "checkmark", "currentLabel"]
  static values = { apiUrl: String, csrfToken: String, current: String }

  connect() {
    this._savedKey = this.currentValue
    this._selectedKey = this.currentValue
  }

  selectTheme(e) {
    const card = e.currentTarget
    const key = card.dataset.themeKey
    if (key === this._selectedKey) return

    this._selectedKey = key

    // Live preview: update the accent immediately
    document.documentElement.setAttribute("data-accent-theme", key)

    // Update card visual states
    this._updateCards()

    // Enable/disable Save based on whether selection differs from saved
    this.saveBtnTarget.disabled = (key === this._savedKey)
    this.statusTarget.textContent = key === this._savedKey ? "" : "Unsaved changes"
  }

  async save() {
    this.saveBtnTarget.disabled = true
    this.statusTarget.textContent = "Saving..."

    try {
      const res = await fetch(this.apiUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfTokenValue,
          "Accept": "application/json"
        },
        body: JSON.stringify({ accent_theme_key: this._selectedKey })
      })

      if (!res.ok) {
        const data = await res.json()
        this.statusTarget.textContent = data.error || "Save failed"
        this.saveBtnTarget.disabled = false
        return
      }

      this._savedKey = this._selectedKey
      this.statusTarget.textContent = "Saved!"
      setTimeout(() => { this.statusTarget.textContent = "" }, 2000)

      // Update "Current" labels
      this._updateCards()
    } catch (err) {
      this.statusTarget.textContent = "Network error"
      this.saveBtnTarget.disabled = false
    }
  }

  cancel() {
    if (this._selectedKey !== this._savedKey) {
      // Revert preview
      this._selectedKey = this._savedKey
      document.documentElement.setAttribute("data-accent-theme", this._savedKey)
      this._updateCards()
      this.saveBtnTarget.disabled = true
      this.statusTarget.textContent = ""
    }
  }

  _updateCards() {
    const cards = this.themeGridTarget.querySelectorAll(".theme-card")
    cards.forEach(card => {
      const key = card.dataset.themeKey
      const isSelected = key === this._selectedKey
      const isSaved = key === this._savedKey

      // Border/ring/bg
      if (isSelected) {
        card.className = card.className
          .replace(/border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800/g, "")
          .replace(/border-brand-500 ring-2 ring-brand-200 dark:ring-brand-800 bg-brand-50 dark:bg-brand-900\/20/g, "")
        if (!card.className.includes("border-brand-500")) {
          card.className += " border-brand-500 ring-2 ring-brand-200 dark:ring-brand-800 bg-brand-50 dark:bg-brand-900/20"
        }
      } else {
        card.className = card.className
          .replace(/border-brand-500 ring-2 ring-brand-200 dark:ring-brand-800 bg-brand-50 dark:bg-brand-900\/20/g, "")
          .replace(/border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800/g, "")
        if (!card.className.includes("border-gray-200")) {
          card.className += " border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
        }
      }
    })

    // Checkmarks
    this.checkmarkTargets.forEach(el => {
      el.classList.toggle("hidden", el.dataset.for !== this._selectedKey)
    })

    // "Current" label
    this.currentLabelTargets.forEach(el => el.remove())
    if (this._savedKey === this._selectedKey) {
      const savedCard = this.themeGridTarget.querySelector(`[data-theme-key="${this._savedKey}"]`)
      if (savedCard) {
        const labelDiv = savedCard.querySelector(".flex-1")
        if (labelDiv && !labelDiv.querySelector("[data-theme-settings-target='currentLabel']")) {
          const span = document.createElement("span")
          span.className = "block text-xs text-brand-600 dark:text-brand-400 font-medium"
          span.setAttribute("data-theme-settings-target", "currentLabel")
          span.textContent = "Current"
          labelDiv.appendChild(span)
        }
      }
    }
  }
}
