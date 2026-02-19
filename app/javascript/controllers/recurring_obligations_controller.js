import { Controller } from "@hotwired/stimulus"
import { renderIconSvg } from "controllers/shared/icon_catalog"

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
    "optionsModal", "includeInactive",
    "reportContent", "monthLabel", "summaryHead", "summaryBody",
    "statCount", "statAmount"
  ]
  static values = { apiUrl: String, year: Number, month: Number, monthLabel: String }

  connect() {
    this._includeInactive = false
  }

  // --- Modal Logic ---

  showOptions() {
    this.includeInactiveTarget.checked = this._includeInactive
    this.optionsModalTarget.style.display = ""
    this.reportContentTargets.forEach(el => el.style.display = "none")
  }

  runReport() {
    this._includeInactive = this.includeInactiveTarget.checked
    this.optionsModalTarget.style.display = "none"
    this.reportContentTargets.forEach(el => el.style.display = "")
    this.fetchData()
  }

  // --- Data Fetching ---

  async fetchData() {
    try {
      let url = `${this.apiUrlValue}?year=${this.yearValue}&month=${this.monthValue}`
      if (this._includeInactive) url += "&include_inactive=1"
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      this._data = await res.json()
      this.render()
    } catch (e) {
      console.error("Failed to load report data:", e)
    }
  }

  // --- Rendering ---

  render() {
    const d = this._data
    this.monthLabelTarget.textContent = d.month_label

    // Summary stats
    this.statCountTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Obligations</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${d.total_obligations}</div>`
    this.statAmountTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Expected</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${fmt(d.total_expected)}</div>`

    if (d.obligations.length === 0) {
      this.summaryBodyTarget.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No recurring obligations for this month.</td></tr>`
      return
    }

    const rows = d.obligations.map(ob => {
      const icon = ob.icon_key ? renderIconSvg(ob.icon_key, ob.color_key || "blue", "h-4 w-4") : ""
      const inactiveClass = ob.use_flag ? "" : " opacity-50"
      const inactiveBadge = ob.use_flag ? "" : `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Inactive</span>`

      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors${inactiveClass}">
        <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">${escapeHtml(ob.due_day_display)}</td>
        <td class="px-4 py-3">
          <div class="flex items-center">
            <span class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(ob.name)}</span>${inactiveBadge}
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(ob.account_name)}</td>
        <td class="px-4 py-3">
          <div class="flex items-center space-x-2">
            <div class="flex-shrink-0">${icon}</div>
            <span class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(ob.category_name)}</span>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(ob.frequency_name)}</td>
        <td class="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-white">${fmt(ob.amount)}</td>
        <td class="px-4 py-3 text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            ${escapeHtml(ob.status)}
          </span>
        </td>
      </tr>`
    }).join("")

    const totalRow = `<tr class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">
      <td class="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white" colspan="5">Total</td>
      <td class="px-4 py-3 text-sm font-bold text-right text-gray-900 dark:text-white">${fmt(d.total_expected)}</td>
      <td class="px-4 py-3"></td>
    </tr>`

    this.summaryBodyTarget.innerHTML = rows + totalRow
  }

  // --- Print ---

  printReport() {
    if (!this._data) return
    const d = this._data
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    const tableHead = `<tr>
      <th style="text-align:left;">Due Date</th>
      <th style="text-align:left;">Name</th>
      <th style="text-align:left;">Account</th>
      <th style="text-align:left;">Category</th>
      <th style="text-align:left;">Frequency</th>
      <th style="text-align:right;">Amount</th>
      <th style="text-align:center;">Status</th>
    </tr>`

    let tableRows = d.obligations.map(ob =>
      `<tr>
        <td>${escapeHtml(ob.due_day_display)}</td>
        <td>${escapeHtml(ob.name)}${ob.use_flag ? "" : " <em style=\"color:#9ca3af;\">(Inactive)</em>"}</td>
        <td>${escapeHtml(ob.account_name)}</td>
        <td>${escapeHtml(ob.category_name)}</td>
        <td>${escapeHtml(ob.frequency_name)}</td>
        <td style="text-align:right;font-family:monospace;">${fmt(ob.amount)}</td>
        <td style="text-align:center;">${escapeHtml(ob.status)}</td>
      </tr>`
    ).join("")

    tableRows += `<tr class="total-row">
      <td colspan="5" style="text-align:right;">Total</td>
      <td style="text-align:right;font-family:monospace;">${fmt(d.total_expected)}</td>
      <td></td>
    </tr>`

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BudgetHQ \u2013 Recurring Obligations</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 32px; font-size: 11px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 36px; height: 36px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; }
    .brand { font-size: 22px; font-weight: 700; color: #2563eb; }
    .brand span { color: #6b7280; font-weight: 400; font-size: 14px; margin-left: 6px; }
    .date-printed { font-size: 11px; color: #6b7280; text-align: right; }
    .meta { margin-bottom: 16px; }
    .meta p { font-size: 11px; color: #4b5563; margin-bottom: 2px; }
    .meta strong { color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #d1d5db; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    tr:nth-child(even) { background: #f9fafb; }
    .total-row { border-top: 2px solid #111; font-weight: 700; font-size: 12px; }
    .total-row td { padding-top: 8px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 0; }
      @page { margin: 0.5in; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">B</div>
      <div>
        <div class="brand">BudgetHQ <span>Recurring Obligations</span></div>
      </div>
    </div>
    <div class="date-printed">Printed ${escapeHtml(today)}</div>
  </div>

  <div class="meta">
    <p><strong>Month:</strong> ${escapeHtml(d.month_label)}</p>
    <p><strong>Total Obligations:</strong> ${d.total_obligations} &nbsp;|&nbsp; <strong>Total Expected:</strong> ${fmt(d.total_expected)}</p>
  </div>

  <table>
    <thead>${tableHead}</thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">BudgetHQ &mdash; Generated on ${escapeHtml(today)}</div>

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
