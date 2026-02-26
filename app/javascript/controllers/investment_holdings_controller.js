import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = ["tableBody", "total"]
  static values = {
    apiUrl: String,
    accountId: Number,
    detailBaseUrl: String,
    csrfToken: String
  }

  connect() {
    this.holdings = []
    this.sortField = "market_value"
    this.sortDir = "desc"
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const url = `${this.apiUrlValue}?investment_account_id=${this.accountIdValue}`
      const res = await fetch(url, { credentials: "same-origin" })
      if (!res.ok) { this._showError("Failed to load holdings."); return }
      this.holdings = await res.json()
      this.renderTable()
    } catch (e) {
      this._showError("Failed to load holdings.")
    }
  }

  toggleSort(event) {
    const field = event.currentTarget.dataset.sortField
    if (this.sortField === field) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc"
    } else {
      this.sortField = field
      this.sortDir = (field === "ticker_symbol" || field === "security_name") ? "asc" : "desc"
    }
    this._updateSortIcons()
    this.renderTable()
  }

  renderTable() {
    const sorted = this._getSorted()
    if (sorted.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No holdings in this account yet.</td></tr>`
    } else {
      this.tableBodyTarget.innerHTML = sorted.map(h => this._renderRow(h)).join("")
    }
    this._updateTotal(sorted)
    this._updateSortIcons()
  }

  _getSorted() {
    const list = [...this.holdings]
    if (!this.sortField) return list
    const dir = this.sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      const f = this.sortField
      if (f === "ticker_symbol" || f === "security_name") {
        return ((a[f] || "").toLowerCase() < (b[f] || "").toLowerCase() ? -1 : 1) * dir
      }
      return (parseFloat(a[f] || 0) - parseFloat(b[f] || 0)) * dir
    })
    return list
  }

  _renderRow(h) {
    const ticker = h.ticker_symbol || "---"
    const shares = h.shares_held != null
      ? parseFloat(h.shares_held).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
      : "\u2014"
    const price = this._fmt(h.current_price)
    const mv = this._fmt(h.market_value)
    const cb = this._fmt(h.cost_basis)
    const ug = parseFloat(h.unrealized_gain || 0)
    const ugColor = ug >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    const pct = parseFloat(h.gain_pct || 0)
    const pctStr = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%"
    const detailUrl = `${this.detailBaseUrlValue}/${h.id}`

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-4 text-sm font-bold">
        <a href="${detailUrl}" class="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline">${escapeHtml(ticker)}</a>
      </td>
      <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${escapeHtml(h.security_name)}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${shares}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${price}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums font-semibold">${mv}</td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white text-right tabular-nums">${cb}</td>
      <td class="px-6 py-4 text-sm ${ugColor} text-right tabular-nums font-medium">${ug >= 0 ? "+" : ""}${this._fmt(ug)}</td>
      <td class="px-6 py-4 text-sm ${ugColor} text-right tabular-nums">${pctStr}</td>
    </tr>`
  }

  _updateTotal(sorted) {
    if (!this.hasTotalTarget) return
    const totalMv = sorted.reduce((s, h) => s + parseFloat(h.market_value || 0), 0)
    this.totalTarget.textContent = `${sorted.length} holding${sorted.length === 1 ? "" : "s"} \u00b7 ${this._fmt(totalMv)} total`
  }

  _updateSortIcons() {
    this.element.querySelectorAll("[data-sort-icon]").forEach(el => {
      el.textContent = el.dataset.sortIcon === this.sortField
        ? (this.sortDir === "asc" ? "\u25B2" : "\u25BC")
        : ""
    })
  }

  _showError(msg) {
    this.tableBodyTarget.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-sm text-red-500">${msg}</td></tr>`
  }

  _fmt(val) {
    return parseFloat(val || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })
  }
}
