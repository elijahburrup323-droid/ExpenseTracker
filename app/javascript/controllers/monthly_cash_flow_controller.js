import { Controller } from "@hotwired/stimulus"

function fmt(amount) {
  const n = parseFloat(amount) || 0
  const sign = n < 0 ? "-" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function amountClass(amount) {
  const n = parseFloat(amount) || 0
  if (n < 0) return "text-red-600 dark:text-red-400"
  return "text-gray-900 dark:text-white"
}

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = ["monthLabel", "summaryBody", "detailsSection"]
  static values = { apiUrl: String, year: Number, month: Number }

  connect() {
    this._depositsOpen = false
    this._paymentsOpen = false
    this.fetchData()
  }

  prevMonth() {
    this.monthValue--
    if (this.monthValue < 1) {
      this.monthValue = 12
      this.yearValue--
    }
    this.fetchData()
  }

  nextMonth() {
    this.monthValue++
    if (this.monthValue > 12) {
      this.monthValue = 1
      this.yearValue++
    }
    this.fetchData()
  }

  async fetchData() {
    try {
      const url = `${this.apiUrlValue}?year=${this.yearValue}&month=${this.monthValue}`
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      this._data = await res.json()
      this.render()
    } catch (e) {
      console.error("Failed to load report data:", e)
    }
  }

  render() {
    const d = this._data
    this.monthLabelTarget.textContent = d.month_label

    // Summary table
    this.summaryBodyTarget.innerHTML = `
      <tr class="border-b border-gray-100 dark:border-gray-700">
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Beginning Balance</td>
        <td class="px-6 py-4 text-sm font-semibold text-right ${amountClass(d.beginning_balance)}">${fmt(d.beginning_balance)}</td>
      </tr>
      <tr class="border-b border-gray-100 dark:border-gray-700 bg-green-50/50 dark:bg-green-900/10">
        <td class="px-6 py-4 text-sm font-medium text-green-700 dark:text-green-400">
          <span class="inline-flex items-center">
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Total Deposits
          </span>
        </td>
        <td class="px-6 py-4 text-sm font-semibold text-right text-green-700 dark:text-green-400">${fmt(d.total_deposits)}</td>
      </tr>
      <tr class="border-b border-gray-100 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/10">
        <td class="px-6 py-4 text-sm font-medium text-red-700 dark:text-red-400">
          <span class="inline-flex items-center">
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"/>
            </svg>
            Total Payments
          </span>
        </td>
        <td class="px-6 py-4 text-sm font-semibold text-right text-red-700 dark:text-red-400">${fmt(d.total_payments)}</td>
      </tr>
      <tr class="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
        <td class="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">Net Cash Flow</td>
        <td class="px-6 py-4 text-sm font-bold text-right ${amountClass(d.net_cash_flow)}">${fmt(d.net_cash_flow)}</td>
      </tr>
      <tr class="bg-brand-50/50 dark:bg-brand-900/10">
        <td class="px-6 py-4 text-sm font-bold text-brand-700 dark:text-brand-400">Ending Balance</td>
        <td class="px-6 py-4 text-sm font-bold text-right ${amountClass(d.ending_balance)}">${fmt(d.ending_balance)}</td>
      </tr>`

    // Detail sections
    this.detailsSectionTarget.innerHTML = `
      ${this._renderDetailSection("Deposits by Account", d.deposits_by_account, this._depositsOpen, "deposits", "green")}
      ${this._renderDetailSection("Payments by Category", d.payments_by_category, this._paymentsOpen, "payments", "red")}`
  }

  _renderDetailSection(title, items, isOpen, key, color) {
    const chevron = isOpen
      ? `<svg class="h-5 w-5 transform rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`
      : `<svg class="h-5 w-5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`

    const total = items.reduce((sum, [, amt]) => sum + amt, 0).toFixed(2)
    const countLabel = `${items.length} item${items.length !== 1 ? "s" : ""}`

    let body = ""
    if (isOpen && items.length > 0) {
      const rows = items.map(([name, amt]) =>
        `<tr class="border-b border-gray-100 dark:border-gray-700">
          <td class="px-6 py-2.5 text-sm text-gray-700 dark:text-gray-300">${escapeHtml(name)}</td>
          <td class="px-6 py-2.5 text-sm text-right font-medium ${amountClass(amt)}">${fmt(amt)}</td>
        </tr>`
      ).join("")

      body = `<div class="overflow-hidden">
        <table class="min-w-full">
          <tbody>${rows}
            <tr class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">
              <td class="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
              <td class="px-6 py-3 text-sm font-bold text-right ${amountClass(total)}">${fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>`
    } else if (isOpen && items.length === 0) {
      body = `<div class="px-6 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">No data for this month.</div>`
    }

    return `<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
      <button type="button"
              class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              data-action="click->monthly-cash-flow#toggleSection"
              data-section="${key}">
        <div class="flex items-center space-x-3">
          <span class="text-sm font-semibold text-gray-900 dark:text-white">${title}</span>
          <span class="text-xs text-gray-400 dark:text-gray-500">${countLabel}</span>
        </div>
        <div class="flex items-center space-x-3 text-gray-400 dark:text-gray-500">
          <span class="text-sm font-medium ${color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${fmt(total)}</span>
          ${chevron}
        </div>
      </button>
      ${body}
    </div>`
  }

  toggleSection(event) {
    const section = event.currentTarget.dataset.section
    if (section === "deposits") this._depositsOpen = !this._depositsOpen
    if (section === "payments") this._paymentsOpen = !this._paymentsOpen
    this.render()
  }
}
