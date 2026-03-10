import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "optionsModal", "accountSelect",
    "startMonthSelect", "startYearSelect", "endMonthSelect", "endYearSelect",
    "reportHeader", "reportContent", "reportBody", "subtitle"
  ]

  static values = { apiUrl: String, accountsUrl: String, year: Number, month: Number }

  connect() {
    this._populateDateSelects()
    this._loadAccounts()
  }

  _populateDateSelects() {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    const currentYear = this.yearValue
    const currentMonth = this.monthValue

    ;[this.startMonthSelectTarget, this.endMonthSelectTarget].forEach(sel => {
      sel.innerHTML = months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("")
    })
    ;[this.startYearSelectTarget, this.endYearSelectTarget].forEach(sel => {
      sel.innerHTML = ""
      for (let y = currentYear - 3; y <= currentYear; y++) {
        sel.innerHTML += `<option value="${y}">${y}</option>`
      }
    })

    this.startMonthSelectTarget.value = "1"
    this.startYearSelectTarget.value = String(currentYear)
    this.endMonthSelectTarget.value = String(currentMonth)
    this.endYearSelectTarget.value = String(currentYear)
  }

  async _loadAccounts() {
    try {
      const res = await fetch(this.accountsUrlValue, { credentials: "same-origin" })
      const accounts = await res.json()
      const sel = this.accountSelectTarget
      sel.innerHTML = `<option value="">All Accounts</option>`
      accounts.forEach(a => {
        sel.innerHTML += `<option value="${a.id}">${this._esc(a.name)}</option>`
      })
    } catch (e) { /* silent */ }
  }

  showOptions() {
    this.optionsModalTarget.classList.remove("hidden")
    this.reportHeaderTarget.classList.add("hidden")
    this.reportContentTarget.classList.add("hidden")
  }

  async runReport() {
    const params = new URLSearchParams({
      start_year: this.startYearSelectTarget.value,
      start_month: this.startMonthSelectTarget.value,
      end_year: this.endYearSelectTarget.value,
      end_month: this.endMonthSelectTarget.value
    })
    const accountId = this.accountSelectTarget.value
    if (accountId) params.set("account_id", accountId)

    this.optionsModalTarget.classList.add("hidden")
    this.reportHeaderTarget.classList.remove("hidden")
    this.reportContentTarget.classList.remove("hidden")
    this.reportBodyTarget.innerHTML = `<div class="text-center py-8 text-gray-400">Loading...</div>`

    const startLabel = this.startMonthSelectTarget.options[this.startMonthSelectTarget.selectedIndex].text
    const endLabel = this.endMonthSelectTarget.options[this.endMonthSelectTarget.selectedIndex].text
    this.subtitleTarget.textContent = `${startLabel} ${this.startYearSelectTarget.value} — ${endLabel} ${this.endYearSelectTarget.value}`

    try {
      const res = await fetch(`${this.apiUrlValue}?${params}`, { credentials: "same-origin" })
      const data = await res.json()
      this._renderReport(data)
    } catch (e) {
      this.reportBodyTarget.innerHTML = `<div class="text-center py-8 text-red-500">Failed to load report.</div>`
    }
  }

  _renderReport(data) {
    if (!data.accounts || data.accounts.length === 0) {
      this.reportBodyTarget.innerHTML = `<div class="text-center py-8 text-gray-400">No snapshot data found for the selected range.</div>`
      return
    }

    let html = ""
    for (const acct of data.accounts) {
      html += `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div class="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">${this._esc(acct.name)}</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">Account ID: ${acct.id} · ${this._esc(acct.account_type || "")}</p>
            </div>
          </div>
        </div>`

      for (const month of acct.months) {
        const varianceClass = month.has_variance
          ? "text-red-600 dark:text-red-400 font-bold"
          : "text-green-600 dark:text-green-400"
        const varianceIcon = month.has_variance ? "⚠" : "✓"
        const staleBadge = month.is_stale
          ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">STALE</span>`
          : ""
        const noSnapshotBadge = !month.has_snapshot
          ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300">NO SNAPSHOT</span>`
          : ""

        html += `<div class="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="px-6 py-3 bg-gray-50/50 dark:bg-gray-700/25 flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${this._esc(month.label)}</span>${staleBadge}${noSnapshotBadge}
              <span class="text-xs text-gray-500 dark:text-gray-400">Begin: ${this._fmt(month.beginning_balance)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Snapshot End: ${this._fmt(month.snapshot_ending_balance)}</span>
            </div>
            <span class="${varianceClass} text-xs">${varianceIcon} Variance: ${this._fmt(month.variance)}</span>
          </div>`

        if (month.transactions.length > 0) {
          html += `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead><tr>
              <th class="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Date</th>
              <th class="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Type</th>
              <th class="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Description</th>
              <th class="px-4 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Amount</th>
              <th class="px-4 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Running Balance</th>
            </tr></thead><tbody class="divide-y divide-gray-100 dark:divide-gray-700/50">`

          for (const txn of month.transactions) {
            const amtClass = txn.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td class="px-4 py-1.5 text-xs text-gray-600 dark:text-gray-400">${this._esc(txn.date)}</td>
              <td class="px-4 py-1.5 text-xs text-gray-600 dark:text-gray-400">${this._esc(txn.type)}</td>
              <td class="px-4 py-1.5 text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">${this._esc(txn.description)}</td>
              <td class="px-4 py-1.5 text-xs text-right tabular-nums ${amtClass}">${this._fmt(txn.amount)}</td>
              <td class="px-4 py-1.5 text-xs text-right tabular-nums text-gray-900 dark:text-white">${this._fmt(txn.running_balance)}</td>
            </tr>`
          }

          html += `</tbody></table></div>`
        } else {
          html += `<div class="px-6 py-3 text-xs text-gray-400">No transactions this month.</div>`
        }

        // Summary row
        html += `<div class="px-6 py-2 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center space-x-6 text-xs">
            <span class="text-gray-500">Calculated Ending: <strong class="text-gray-900 dark:text-white">${this._fmt(month.calculated_ending_balance)}</strong></span>
            <span class="text-gray-500">Snapshot Ending: <strong class="text-gray-900 dark:text-white">${this._fmt(month.snapshot_ending_balance)}</strong></span>
          </div>
          <span class="${varianceClass} text-xs font-semibold">Variance: ${this._fmt(month.variance)}</span>
        </div></div>`
      }

      html += `</div>`
    }

    this.reportBodyTarget.innerHTML = html
  }

  _fmt(val) {
    const num = parseFloat(val || 0)
    return num.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }

  _esc(str) {
    if (!str) return ""
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
