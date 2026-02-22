import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { apiUrl: String, csrfToken: String, current: Number }
  static targets = ["display", "decrease", "increase"]

  static MIN = 80
  static MAX = 130
  static STEP = 5

  connect() {
    this._saveTimer = null
    this._updateButtons()
  }

  decrease() {
    const next = Math.max(this.constructor.MIN, this.currentValue - this.constructor.STEP)
    if (next !== this.currentValue) this._apply(next)
  }

  increase() {
    const next = Math.min(this.constructor.MAX, this.currentValue + this.constructor.STEP)
    if (next !== this.currentValue) this._apply(next)
  }

  reset() {
    if (this.currentValue !== 100) this._apply(100)
  }

  _apply(percent) {
    this.currentValue = percent
    document.documentElement.style.setProperty("--text-scale", percent / 100)
    this._updateButtons()
    this._debouncedSave(percent)
  }

  _updateButtons() {
    this.displayTarget.textContent = `${this.currentValue}%`
    if (this.hasDecreaseTarget) this.decreaseTarget.disabled = (this.currentValue <= this.constructor.MIN)
    if (this.hasIncreaseTarget) this.increaseTarget.disabled = (this.currentValue >= this.constructor.MAX)
  }

  _debouncedSave(percent) {
    clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => this._save(percent), 600)
  }

  async _save(percent) {
    try {
      await fetch(this.apiUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ text_scale_percent: percent })
      })
    } catch (e) {
      // Silently fail — preference will reset on next login
    }
  }
}
