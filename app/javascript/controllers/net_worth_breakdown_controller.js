import { Controller } from "@hotwired/stimulus"

/**
 * Net Worth Breakdown Controller
 *
 * Handles click-to-select on chart dots to load historical asset/liability
 * breakdowns for a given month. Updates the asset/liability tables and
 * net worth summary dynamically.
 */
export default class extends Controller {
  static targets = [
    "dot", "assetList", "liabilityList",
    "assetTotal", "liabilityTotal",
    "netWorthValue", "selectedLabel"
  ]
  static values = { url: String }

  connect() {
    this._selectedIndex = null
  }

  selectMonth(event) {
    const circle = event.currentTarget
    const year = parseInt(circle.dataset.year)
    const month = parseInt(circle.dataset.nwMonth)
    const label = circle.dataset.label
    if (!year || !month) return

    // Highlight selected dot
    this.element.querySelectorAll("[data-role='chart-dot']").forEach(d => {
      d.setAttribute("r", "3")
      d.setAttribute("fill", "#a855f7")
    })
    circle.closest("svg").querySelectorAll("[data-role='chart-dot']").forEach(d => {
      if (d.dataset.year === String(year) && d.dataset.month === String(month)) {
        d.setAttribute("r", "5")
        d.setAttribute("fill", "#7c3aed")
      }
    })

    // Update selected label
    if (this.hasSelectedLabelTarget) {
      this.selectedLabelTarget.textContent = label || `${year}-${month}`
    }

    this._fetchBreakdown(year, month)
  }

  async _fetchBreakdown(year, month) {
    try {
      const url = `${this.urlValue}?year=${year}&month=${month}`
      const resp = await fetch(url, {
        headers: { "Accept": "application/json" }
      })
      if (!resp.ok) return
      const data = await resp.json()
      this._renderBreakdown(data)
    } catch (e) { /* silently fail */ }
  }

  _renderBreakdown(data) {
    const fmt = (v) => new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD"
    }).format(v)

    // Assets
    if (this.hasAssetListTarget) {
      if (data.assets.length > 0) {
        this.assetListTarget.innerHTML = data.assets.map(a =>
          `<div class="flex items-center justify-between">
            <span class="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">${this._esc(a.name)}</span>
            <span class="text-xs font-medium text-gray-900 dark:text-white tabular-nums flex-shrink-0">${fmt(a.value)}</span>
          </div>`
        ).join("")
      } else {
        this.assetListTarget.innerHTML = '<p class="text-xs text-gray-400 dark:text-gray-500">No assets.</p>'
      }
    }

    // Liabilities
    if (this.hasLiabilityListTarget) {
      if (data.liabilities.length > 0) {
        this.liabilityListTarget.innerHTML = data.liabilities.map(l =>
          `<div class="flex items-center justify-between">
            <span class="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">${this._esc(l.name)}</span>
            <span class="text-xs font-medium text-red-500 dark:text-red-400 tabular-nums flex-shrink-0">-${fmt(l.value)}</span>
          </div>`
        ).join("")
      } else {
        this.liabilityListTarget.innerHTML = '<p class="text-xs text-gray-400 dark:text-gray-500">No liabilities.</p>'
      }
    }

    // Totals
    if (this.hasAssetTotalTarget) {
      this.assetTotalTarget.textContent = fmt(data.total_assets)
    }
    if (this.hasLiabilityTotalTarget) {
      this.liabilityTotalTarget.textContent = `-${fmt(data.total_liabilities)}`
    }

    // Net worth
    if (this.hasNetWorthValueTarget) {
      this.netWorthValueTarget.textContent = fmt(data.net_worth)
      this.netWorthValueTarget.className = this.netWorthValueTarget.className
        .replace(/text-emerald-\S+/g, "")
        .replace(/text-red-\S+/g, "")
      if (data.net_worth >= 0) {
        this.netWorthValueTarget.classList.add("text-emerald-600", "dark:text-emerald-400")
      } else {
        this.netWorthValueTarget.classList.add("text-red-500", "dark:text-red-400")
      }
    }
  }

  _esc(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
