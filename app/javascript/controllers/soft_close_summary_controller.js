import { Controller } from "@hotwired/stimulus"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function fmt(amount) {
  const n = parseFloat(amount) || 0
  const sign = n < 0 ? "-" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function colorClass(val) {
  if (val > 0) return "text-green-600 dark:text-green-400"
  if (val < 0) return "text-red-600 dark:text-red-400"
  return "text-gray-500 dark:text-gray-400"
}

export default class extends Controller {
  static targets = [
    "optionsModal", "reportContent",
    "monthSelect", "yearSelect",
    "includeAccountDetail", "includeIncomeSummary", "includeNetWorth",
    "optionsError", "reportSubtitle", "reportBody"
  ]
  static values = { apiUrl: String, year: Number, month: Number }

  connect() {
    this._populateSelectors()
  }

  _populateSelectors() {
    const currentYear = this.yearValue
    const currentMonth = this.monthValue
    const monthOptions = MONTHS.map((name, i) => `<option value="${i + 1}">${name}</option>`).join("")
    this.monthSelectTarget.innerHTML = monthOptions

    const years = []
    for (let y = currentYear - 5; y <= currentYear; y++) years.push(y)
    const yearOptions = years.map(y => `<option value="${y}">${y}</option>`).join("")
    this.yearSelectTarget.innerHTML = yearOptions

    // Default to previous month (most recently closed)
    let defMonth = currentMonth - 1
    let defYear = currentYear
    if (defMonth < 1) { defMonth = 12; defYear-- }
    this.monthSelectTarget.value = String(defMonth)
    this.yearSelectTarget.value = String(defYear)
  }

  showOptions() {
    this.optionsErrorTarget.classList.add("hidden")
    this.optionsModalTarget.style.display = ""
    this.reportContentTargets.forEach(el => el.style.display = "none")
  }

  runReport() {
    this.optionsErrorTarget.classList.add("hidden")
    this._showAccountDetail = this.includeAccountDetailTarget.checked
    this._showIncomeSummary = this.includeIncomeSummaryTarget.checked
    this._showNetWorth = this.includeNetWorthTarget.checked

    this.optionsModalTarget.style.display = "none"
    this.reportContentTargets.forEach(el => el.style.display = "")
    this.fetchData()
  }

  async fetchData() {
    try {
      const year = this.yearSelectTarget.value
      const month = this.monthSelectTarget.value
      const url = `${this.apiUrlValue}?year=${year}&month=${month}`
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
    this.reportSubtitleTarget.textContent = d.label

    if (!d.exists) {
      this.reportBodyTarget.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-8 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(d.message)}</p>
        </div>`
      return
    }

    let html = ""

    // Section 1: Month Overview (always shown)
    html += `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-5">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Month Overview</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Month</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${escapeHtml(d.overview.label)}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date Closed</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${escapeHtml(d.overview.closed_at || "N/A")}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Closed By</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${escapeHtml(d.overview.closed_by)}</div>
          </div>
        </div>
      </div>`

    // Section 2: Account Balances
    if (this._showAccountDetail && d.accounts && d.accounts.length > 0) {
      const rows = d.accounts.map(a => {
        return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
          <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(a.name)}</td>
          <td class="px-6 py-3 text-sm text-right font-mono text-gray-700 dark:text-gray-300">${fmt(a.beginning_balance)}</td>
          <td class="px-6 py-3 text-sm text-right font-mono text-gray-700 dark:text-gray-300">${fmt(a.ending_balance)}</td>
          <td class="px-6 py-3 text-sm text-right font-mono ${colorClass(a.change)}">${a.change > 0 ? "+" : ""}${fmt(a.change)}</td>
        </tr>`
      }).join("")

      html += `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Account Balances at Close</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Beginning Balance</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ending Balance</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`
    }

    // Section 3: Income & Spending Summary
    if (this._showIncomeSummary && d.income_spending) {
      const is = d.income_spending
      const netFlow = (is.total_deposits - is.total_payments).toFixed(2)
      html += `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-5">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Income & Spending Summary</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Deposits</div>
              <div class="text-sm font-bold text-green-600 dark:text-green-400 mt-1">${fmt(is.total_deposits)}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Payments</div>
              <div class="text-sm font-bold text-red-600 dark:text-red-400 mt-1">${fmt(is.total_payments)}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Beginning Balance</div>
              <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${fmt(is.beginning_balance)}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ending Balance</div>
              <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${fmt(is.ending_balance)}</div>
            </div>
          </div>
        </div>`
    }

    // Section 4: Net Worth Snapshot
    if (this._showNetWorth && d.net_worth) {
      const nw = d.net_worth
      html += `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-5">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Net Worth Snapshot</h2>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Assets</div>
              <div class="text-sm font-bold text-green-600 dark:text-green-400 mt-1">${fmt(nw.total_assets)}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Liabilities</div>
              <div class="text-sm font-bold ${colorClass(nw.total_liabilities)} mt-1">${fmt(nw.total_liabilities)}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Worth</div>
              <div class="text-lg font-bold ${colorClass(nw.net_worth)} mt-1">${fmt(nw.net_worth)}</div>
            </div>
          </div>
        </div>`
    }

    this.reportBodyTarget.innerHTML = html
  }

  printReport() {
    if (!this._data || !this._data.exists) return
    const d = this._data
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    let sections = ""

    // Overview
    sections += `<h2>Month Overview</h2>
      <table><tbody>
        <tr><td><strong>Month</strong></td><td>${escapeHtml(d.overview.label)}</td></tr>
        <tr><td><strong>Date Closed</strong></td><td>${escapeHtml(d.overview.closed_at || "N/A")}</td></tr>
        <tr><td><strong>Closed By</strong></td><td>${escapeHtml(d.overview.closed_by)}</td></tr>
      </tbody></table>`

    // Account Detail
    if (this._showAccountDetail && d.accounts && d.accounts.length > 0) {
      let accountRows = d.accounts.map(a =>
        `<tr>
          <td>${escapeHtml(a.name)}</td>
          <td style="text-align:right;font-family:monospace;">${fmt(a.beginning_balance)}</td>
          <td style="text-align:right;font-family:monospace;">${fmt(a.ending_balance)}</td>
          <td style="text-align:right;font-family:monospace;${a.change < 0 ? "color:#dc2626;" : a.change > 0 ? "color:#16a34a;" : ""}">${a.change > 0 ? "+" : ""}${fmt(a.change)}</td>
        </tr>`
      ).join("")
      sections += `<h2>Account Balances at Close</h2>
        <table>
          <thead><tr><th>Account</th><th style="text-align:right;">Beginning</th><th style="text-align:right;">Ending</th><th style="text-align:right;">Change</th></tr></thead>
          <tbody>${accountRows}</tbody>
        </table>`
    }

    // Income & Spending
    if (this._showIncomeSummary && d.income_spending) {
      const is = d.income_spending
      sections += `<h2>Income & Spending Summary</h2>
        <table><tbody>
          <tr><td><strong>Total Deposits</strong></td><td style="text-align:right;font-family:monospace;color:#16a34a;">${fmt(is.total_deposits)}</td></tr>
          <tr><td><strong>Total Payments</strong></td><td style="text-align:right;font-family:monospace;color:#dc2626;">${fmt(is.total_payments)}</td></tr>
          <tr><td><strong>Beginning Balance</strong></td><td style="text-align:right;font-family:monospace;">${fmt(is.beginning_balance)}</td></tr>
          <tr><td><strong>Ending Balance</strong></td><td style="text-align:right;font-family:monospace;">${fmt(is.ending_balance)}</td></tr>
        </tbody></table>`
    }

    // Net Worth
    if (this._showNetWorth && d.net_worth) {
      const nw = d.net_worth
      sections += `<h2>Net Worth Snapshot</h2>
        <table><tbody>
          <tr><td><strong>Total Assets</strong></td><td style="text-align:right;font-family:monospace;color:#16a34a;">${fmt(nw.total_assets)}</td></tr>
          <tr><td><strong>Total Liabilities</strong></td><td style="text-align:right;font-family:monospace;${nw.total_liabilities < 0 ? "color:#dc2626;" : ""}">${fmt(nw.total_liabilities)}</td></tr>
          <tr><td><strong>Net Worth</strong></td><td style="text-align:right;font-family:monospace;font-weight:700;${nw.net_worth < 0 ? "color:#dc2626;" : "color:#16a34a;"}">${fmt(nw.net_worth)}</td></tr>
        </tbody></table>`
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MyBudgetHQ \u2013 Soft Close Summary</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 32px; font-size: 11px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 36px; height: 36px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; }
    .brand { font-size: 22px; font-weight: 700; color: #2563eb; }
    .brand span { color: #6b7280; font-weight: 400; font-size: 14px; margin-left: 6px; }
    .date-printed { font-size: 11px; color: #6b7280; text-align: right; }
    h2 { font-size: 13px; font-weight: 700; color: #111; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #d1d5db; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 0; } @page { margin: 0.5in; } thead { display: table-header-group; } tr { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">B</div>
      <div><div class="brand">MyBudgetHQ <span>Soft Close Summary</span></div></div>
    </div>
    <div class="date-printed">Printed ${escapeHtml(today)}</div>
  </div>
  ${sections}
  <div class="footer">MyBudgetHQ &mdash; Generated on ${escapeHtml(today)}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }
}
