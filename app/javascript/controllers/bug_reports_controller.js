import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["list", "showMoreBtn"]
  static values = { apiUrl: String }

  connect() {
    this.page = 1
    this.reports = []
    this.hasMore = false
    this.fetchPage()
  }

  async fetchPage() {
    try {
      const res = await fetch(`${this.apiUrlValue}?page=${this.page}`, { headers: { "Accept": "application/json" } })
      if (res.ok) {
        const data = await res.json()
        this.reports = this.reports.concat(data.reports)
        this.hasMore = data.has_more
        this.render()
      }
    } catch (e) {}
  }

  showMore() {
    this.page++
    this.fetchPage()
  }

  render() {
    if (this.reports.length === 0) {
      this.listTarget.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No bug reports yet.</p>`
      this.showMoreBtnTarget.classList.add("hidden")
      return
    }

    // Group by date
    const grouped = {}
    for (const r of this.reports) {
      if (!grouped[r.processed_date]) grouped[r.processed_date] = []
      grouped[r.processed_date].push(r)
    }

    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

    let html = ""
    for (const date of dates) {
      const [y, m, d] = date.split("-")
      const formatted = `${parseInt(m)}/${parseInt(d)}/${y}`
      html += `<div class="mb-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">${formatted}</h3>
        <div class="space-y-2">`
      for (const r of grouped[date]) {
        html += `<div class="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 ring-1 ring-gray-200 dark:ring-gray-700">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 whitespace-nowrap flex-shrink-0">${this._escapeHtml(r.screen_name)}</span>
          <span class="text-sm text-gray-700 dark:text-gray-300">${this._escapeHtml(r.description)}</span>
        </div>`
      }
      html += `</div></div>`
    }

    this.listTarget.innerHTML = html

    if (this.hasMore) {
      this.showMoreBtnTarget.classList.remove("hidden")
    } else {
      this.showMoreBtnTarget.classList.add("hidden")
    }
  }

  _escapeHtml(str) {
    if (!str) return ""
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
