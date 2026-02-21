import { Controller } from "@hotwired/stimulus"
import { sortTh, sortData, nextSortState } from "controllers/shared/report_sort"

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

export default class extends Controller {
  static targets = [
    "optionsModal", "reportContent",
    "accountSelect", "monthSelect", "yearSelect",
    "includeUnreconciled", "summaryOnly",
    "optionsError", "reportSubtitle", "reportBody"
  ]
  static values = { apiUrl: String, accountsUrl: String, year: Number, month: Number }

  async connect() {
    this._sort = { field: "date", dir: "asc" }
    this._populateSelectors()
    await this._fetchAccounts()
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

    let defMonth = currentMonth - 1
    let defYear = currentYear
    if (defMonth < 1) { defMonth = 12; defYear-- }
    this.monthSelectTarget.value = String(defMonth)
    this.yearSelectTarget.value = String(defYear)
  }

  async _fetchAccounts() {
    try {
      const res = await fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      this._accounts = await res.json()
      const options = this._accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("")
      this.accountSelectTarget.innerHTML = `<option value="">Select an account...</option>` + options
    } catch (e) {
      console.error("Failed to fetch accounts:", e)
    }
  }

  showOptions() {
    this.optionsErrorTarget.classList.add("hidden")
    this.optionsModalTarget.style.display = ""
    this.reportContentTargets.forEach(el => el.style.display = "none")
  }

  runReport() {
    const accountId = this.accountSelectTarget.value
    if (!accountId) {
      this.optionsErrorTarget.textContent = "Please select an account."
      this.optionsErrorTarget.classList.remove("hidden")
      return
    }

    this.optionsErrorTarget.classList.add("hidden")
    this._includeUnreconciled = this.includeUnreconciledTarget.checked
    this._summaryOnly = this.summaryOnlyTarget.checked

    this.optionsModalTarget.style.display = "none"
    this.reportContentTargets.forEach(el => el.style.display = "")
    this.fetchData()
  }

  toggleSort(event) {
    const f = event.currentTarget.dataset.sortField
    if (!f) return
    this._sort = nextSortState(f, this._sort.field, this._sort.dir)
    this.render()
  }

  async fetchData() {
    try {
      const accountId = this.accountSelectTarget.value
      const year = this.yearSelectTarget.value
      const month = this.monthSelectTarget.value
      const url = `${this.apiUrlValue}?year=${year}&month=${month}&account_id=${accountId}`
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
    this.reportSubtitleTarget.textContent = d.exists ? `${escapeHtml(d.summary.account_name)} \u2014 ${escapeHtml(d.label)}` : d.label

    if (!d.exists) {
      this.reportBodyTarget.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-8 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(d.message)}</p>
        </div>`
      return
    }

    let html = ""
    const s = d.summary

    // Section 1: Reconciliation Summary
    const statusBadge = s.reconciled
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Reconciled</span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">Not Reconciled</span>`

    const diffColor = s.difference === 0 ? "text-green-600 dark:text-green-400" : (s.difference !== null ? "text-red-600 dark:text-red-400" : "text-gray-400")

    html += `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Reconciliation Summary</h2>
          ${statusBadge}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${escapeHtml(s.account_name)}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Month</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${escapeHtml(s.label)}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">MyBudgetHQ Balance</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${s.budget_balance !== null ? fmt(s.budget_balance) : "N/A"}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">External Balance</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${s.outside_balance !== null ? fmt(s.outside_balance) : "Not Entered"}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Difference</div>
            <div class="text-sm font-bold ${diffColor} mt-1">${s.difference !== null ? fmt(s.difference) : "\u2014"}</div>
          </div>
          ${s.reconciled_at ? `<div>
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reconciled On</div>
            <div class="text-sm font-bold text-gray-900 dark:text-white mt-1">${escapeHtml(s.reconciled_at)}</div>
          </div>` : ""}
        </div>
      </div>`

    // Section 2: Transaction Detail
    if (!this._summaryOnly) {
      let txns = d.transactions
      if (!this._includeUnreconciled) {
        txns = txns.filter(t => t.reconciled)
      }

      if (txns.length === 0) {
        html += `
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-8 text-center">
            <p class="text-sm text-gray-400 dark:text-gray-500">No transactions for this period.</p>
          </div>`
      } else {
        const sortedTxns = sortData(txns, this._sort.field, this._sort.dir)
        const rows = sortedTxns.map(t => {
          const reconBadge = t.reconciled
            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Yes</span>`
            : `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">No</span>`
          const amtColor = t.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
          return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(t.date)}</td>
            <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(t.description)}</td>
            <td class="px-6 py-3 text-sm text-right font-mono ${amtColor}">${fmt(t.amount)}</td>
            <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(t.type)}</td>
            <td class="px-6 py-3 text-sm text-center">${reconBadge}</td>
          </tr>`
        }).join("")

        html += `
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Transaction Detail</h2>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${txns.length} transaction${txns.length !== 1 ? "s" : ""}</p>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    ${sortTh("Date", "date", this._sort, "reconciliation-summary", "left")}
                    ${sortTh("Description", "description", this._sort, "reconciliation-summary", "left")}
                    ${sortTh("Amount", "amount", this._sort, "reconciliation-summary", "right")}
                    ${sortTh("Type", "type", this._sort, "reconciliation-summary", "left")}
                    ${sortTh("Reconciled", "reconciled", this._sort, "reconciliation-summary", "center")}
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`
      }
    }

    this.reportBodyTarget.innerHTML = html
  }

  printReport() {
    if (!this._data || !this._data.exists) return
    const d = this._data
    const s = d.summary
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    let sections = ""

    // Summary
    sections += `<h2>Reconciliation Summary</h2>
      <table><tbody>
        <tr><td><strong>Account</strong></td><td>${escapeHtml(s.account_name)}</td></tr>
        <tr><td><strong>Month</strong></td><td>${escapeHtml(s.label)}</td></tr>
        <tr><td><strong>MyBudgetHQ Balance</strong></td><td style="font-family:monospace;">${s.budget_balance !== null ? fmt(s.budget_balance) : "N/A"}</td></tr>
        <tr><td><strong>External Balance</strong></td><td style="font-family:monospace;">${s.outside_balance !== null ? fmt(s.outside_balance) : "Not Entered"}</td></tr>
        <tr><td><strong>Difference</strong></td><td style="font-family:monospace;${s.difference !== null && s.difference !== 0 ? "color:#dc2626;" : "color:#16a34a;"}">${s.difference !== null ? fmt(s.difference) : "\u2014"}</td></tr>
        <tr><td><strong>Status</strong></td><td>${s.reconciled ? "Reconciled" : "Not Reconciled"}</td></tr>
        ${s.reconciled_at ? `<tr><td><strong>Reconciled On</strong></td><td>${escapeHtml(s.reconciled_at)}</td></tr>` : ""}
      </tbody></table>`

    // Transactions
    if (!this._summaryOnly) {
      let txns = d.transactions
      if (!this._includeUnreconciled) txns = txns.filter(t => t.reconciled)

      if (txns.length > 0) {
        const txnRows = txns.map(t =>
          `<tr>
            <td>${escapeHtml(t.date)}</td>
            <td>${escapeHtml(t.description)}</td>
            <td style="text-align:right;font-family:monospace;${t.amount < 0 ? "color:#dc2626;" : "color:#16a34a;"}">${fmt(t.amount)}</td>
            <td>${escapeHtml(t.type)}</td>
            <td style="text-align:center;">${t.reconciled ? "Yes" : "No"}</td>
          </tr>`
        ).join("")

        sections += `<h2>Transaction Detail (${txns.length})</h2>
          <table>
            <thead><tr><th>Date</th><th>Description</th><th style="text-align:right;">Amount</th><th>Type</th><th style="text-align:center;">Reconciled</th></tr></thead>
            <tbody>${txnRows}</tbody>
          </table>`
      }
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MyBudgetHQ \u2013 Reconciliation Report</title>
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
      <div><div class="brand">MyBudgetHQ <span>Reconciliation Report</span></div></div>
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
