import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tableBody", "toggleAllButton", "toggleAllLabel"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.frequencies = []
    this.fetchAll()
  }

  // --- Data Fetching ---

  async fetchAll() {
    try {
      const response = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (response.ok) this.frequencies = await response.json()
    } catch (e) {
      // silently fail
    }
    this.renderTable()
  }

  // --- Toggle All ---

  async toggleAll() {
    const allOn = this.frequencies.every(f => f.use_flag)
    const newState = !allOn

    // Update toggle all button visual
    const btn = this.toggleAllButtonTarget
    btn.dataset.checked = String(newState)
    btn.setAttribute("aria-checked", String(newState))
    btn.className = btn.className.replace(newState ? "bg-gray-300" : "bg-purple-600", newState ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(newState ? "translate-x-1" : "translate-x-7", newState ? "translate-x-7" : "translate-x-1")

    // Update all frequencies
    for (const freq of this.frequencies) {
      if (freq.use_flag !== newState) {
        freq.use_flag = newState
        try {
          await fetch(`${this.apiUrlValue}/${freq.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "X-CSRF-Token": this.csrfTokenValue
            },
            body: JSON.stringify({ income_user_frequency: { use_flag: newState } })
          })
        } catch (e) { /* best effort */ }
      }
    }
    this.renderTable()
  }

  // --- Use Toggle ---

  _renderUseToggle(isOn, freqId) {
    const bg = isOn ? "bg-purple-600" : "bg-gray-300"
    const knobTranslate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="use-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg} focus:outline-none focus:ring-2 focus:ring-purple-300"
      data-checked="${isOn}" data-id="${freqId}"
      data-action="click->income-user-frequencies#toggleUse"
      role="switch" aria-checked="${isOn}" title="${isOn ? 'Use: Yes' : 'Use: No'}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${knobTranslate}"></span>
    </button>`
  }

  async toggleUse(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn

    // Update visual state immediately
    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.title = nowOn ? "Use: Yes" : "Use: No"
    btn.className = btn.className.replace(nowOn ? "bg-gray-300" : "bg-purple-600", nowOn ? "bg-purple-600" : "bg-gray-300")
    const knob = btn.querySelector("span")
    knob.className = knob.className.replace(nowOn ? "translate-x-1" : "translate-x-7", nowOn ? "translate-x-7" : "translate-x-1")

    const freqId = btn.dataset.id
    try {
      const response = await fetch(`${this.apiUrlValue}/${freqId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ income_user_frequency: { use_flag: nowOn } })
      })
      if (response.ok) {
        const updated = await response.json()
        const idx = this.frequencies.findIndex(f => f.id === Number(freqId))
        if (idx !== -1) this.frequencies[idx] = updated
      }
    } catch (e) {
      // Revert on error
      btn.dataset.checked = String(wasOn)
      btn.setAttribute("aria-checked", String(wasOn))
      btn.title = wasOn ? "Use: Yes" : "Use: No"
      btn.className = btn.className.replace(wasOn ? "bg-gray-300" : "bg-purple-600", wasOn ? "bg-purple-600" : "bg-gray-300")
      knob.className = knob.className.replace(wasOn ? "translate-x-1" : "translate-x-7", wasOn ? "translate-x-7" : "translate-x-1")
    }
  }

  // --- Pattern Description ---

  _patternDetails(freq) {
    switch (freq.frequency_type) {
      case "standard":
        if (freq.interval_days) return `Every ${freq.interval_days} days`
        return freq.name
      case "exact_day":
        if (freq.is_last_day) return "Last day of each month"
        return `Day ${freq.day_of_month} of each month`
      case "ordinal_weekday": {
        const ordinals = ["", "1st", "2nd", "3rd", "4th"]
        const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        return `${ordinals[freq.ordinal] || ""} ${days[freq.weekday] || ""} of each month`
      }
      default:
        return ""
    }
  }

  _categoryLabel(type) {
    switch (type) {
      case "standard": return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Standard</span>`
      case "exact_day": return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Exact Day</span>`
      case "ordinal_weekday": return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Ordinal Weekday</span>`
      default: return type || ""
    }
  }

  // --- Rendering ---

  renderTable() {
    if (this.frequencies.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No frequencies available.</td></tr>`
      return
    }

    let html = ""
    for (const freq of this.frequencies) {
      const escName = this._escapeHtml(freq.name)
      html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escName}</td>
        <td class="px-6 py-4 text-sm">${this._categoryLabel(freq.frequency_type)}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${this._patternDetails(freq)}</td>
        <td class="px-6 py-4 text-center">${this._renderUseToggle(freq.use_flag, freq.id)}</td>
      </tr>`
    }
    this.tableBodyTarget.innerHTML = html
  }

  _escapeHtml(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
