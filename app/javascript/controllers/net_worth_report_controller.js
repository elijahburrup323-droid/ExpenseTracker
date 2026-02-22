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

function colorClass(val) {
  if (val > 0) return "text-green-600 dark:text-green-400"
  if (val < 0) return "text-red-600 dark:text-red-400"
  return "text-gray-500 dark:text-gray-400"
}

export default class extends Controller {
  static targets = [
    "optionsModal", "reportContent",
    "startMonthSelect", "startYearSelect", "endMonthSelect", "endYearSelect",
    "inBudgetCheckbox",
    "formatTable", "formatChart", "optionsError",
    "reportSubtitle", "tableContainer", "chartContainer",
    "tableHead", "tableBody",
    "statAssets", "statLiabilities", "statNetWorth"
  ]
  static values = { apiUrl: String, year: Number, month: Number }

  connect() {
    this._format = "table"
    this._sort = { field: "label", dir: "asc" }
    this._populateDateSelectors()
  }

  toggleSort(event) {
    const f = event.currentTarget.dataset.sortField
    if (!f) return
    this._sort = nextSortState(f, this._sort.field, this._sort.dir)
    if (this._data) this.render()
  }

  _populateDateSelectors() {
    const currentYear = this.yearValue
    const currentMonth = this.monthValue
    const monthOptions = MONTHS.map((name, i) => `<option value="${i + 1}">${name}</option>`).join("")
    this.startMonthSelectTarget.innerHTML = monthOptions
    this.endMonthSelectTarget.innerHTML = monthOptions

    const years = []
    for (let y = currentYear - 5; y <= currentYear; y++) years.push(y)
    const yearOptions = years.map(y => `<option value="${y}">${y}</option>`).join("")
    this.startYearSelectTarget.innerHTML = yearOptions
    this.endYearSelectTarget.innerHTML = yearOptions

    this.startMonthSelectTarget.value = String(currentMonth)
    this.startYearSelectTarget.value = String(currentYear)
    this.endMonthSelectTarget.value = String(currentMonth)
    this.endYearSelectTarget.value = String(currentYear)
  }

  showOptions() {
    this.optionsErrorTarget.classList.add("hidden")
    this.optionsModalTarget.style.display = ""
    this.reportContentTargets.forEach(el => el.style.display = "none")
  }

  runReport() {
    const startYear = parseInt(this.startYearSelectTarget.value)
    const startMonth = parseInt(this.startMonthSelectTarget.value)
    const endYear = parseInt(this.endYearSelectTarget.value)
    const endMonth = parseInt(this.endMonthSelectTarget.value)

    if (new Date(startYear, startMonth - 1) > new Date(endYear, endMonth - 1)) {
      this.optionsErrorTarget.textContent = "Start date must be before or equal to end date."
      this.optionsErrorTarget.classList.remove("hidden")
      return
    }
    const diffMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1
    if (diffMonths > 60) {
      this.optionsErrorTarget.textContent = "Date range cannot exceed 60 months."
      this.optionsErrorTarget.classList.remove("hidden")
      return
    }

    this.optionsErrorTarget.classList.add("hidden")
    this._format = this.formatChartTarget.checked ? "chart" : "table"

    this.optionsModalTarget.style.display = "none"
    this.reportContentTargets.forEach(el => el.style.display = "")
    this.fetchData()
  }

  async fetchData() {
    try {
      const startYear = this.startYearSelectTarget.value
      const startMonth = this.startMonthSelectTarget.value
      const endYear = this.endYearSelectTarget.value
      const endMonth = this.endMonthSelectTarget.value
      const inBudgetOnly = this.inBudgetCheckboxTarget.checked ? "1" : "0"

      const url = `${this.apiUrlValue}?start_year=${startYear}&start_month=${startMonth}&end_year=${endYear}&end_month=${endMonth}&in_budget_only=${inBudgetOnly}`
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
    const filterLabel = d.in_budget_only ? "In-Budget Accounts" : "All Accounts"
    this.reportSubtitleTarget.textContent = `${filterLabel} \u2014 ${escapeHtml(d.start_label)} to ${escapeHtml(d.end_label)}`

    // Summary stats from last month in data
    const lastRow = d.months.length > 0 ? d.months[d.months.length - 1] : null
    const totalAssets = lastRow ? lastRow.total_assets : 0
    const totalLiabilities = lastRow ? lastRow.total_liabilities : 0
    const netWorth = lastRow ? lastRow.net_worth : 0

    this.statAssetsTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Assets</div>
      <div class="text-lg font-bold text-green-600 dark:text-green-400 mt-1">${fmt(totalAssets)}</div>`
    this.statLiabilitiesTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Liabilities</div>
      <div class="text-lg font-bold ${colorClass(totalLiabilities)} mt-1">${fmt(totalLiabilities)}</div>`
    this.statNetWorthTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Worth</div>
      <div class="text-lg font-bold ${colorClass(netWorth)} mt-1">${fmt(netWorth)}</div>`

    if (this._format === "chart") {
      this.tableContainerTarget.classList.add("hidden")
      this.chartContainerTarget.classList.remove("hidden")
      this.renderChart(d)
    } else {
      this.tableContainerTarget.classList.remove("hidden")
      this.chartContainerTarget.classList.add("hidden")
      this.renderTable(d)
    }
  }

  renderTable(d) {
    this.tableHeadTarget.innerHTML = `<tr>
      ${sortTh("Month", "label", this._sort, "net-worth-report", "left")}
      ${sortTh("Total Assets", "total_assets", this._sort, "net-worth-report", "right")}
      ${sortTh("Total Liabilities", "total_liabilities", this._sort, "net-worth-report", "right")}
      ${sortTh("Net Worth", "net_worth", this._sort, "net-worth-report", "right")}
      ${sortTh("Change", "change", this._sort, "net-worth-report", "right")}
    </tr>`

    if (d.months.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No data for this period.</td></tr>`
      return
    }

    const sorted = sortData(d.months, this._sort.field, this._sort.dir)
    const rows = sorted.map(m => {
      const changeHtml = m.change === null
        ? `<span class="text-gray-400">\u2014</span>`
        : `<span class="${colorClass(m.change)}">${m.change > 0 ? "+" : ""}${fmt(m.change)}</span>`

      const liveBadge = m.source === "live"
        ? ` <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Live</span>`
        : ""

      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(m.label)}${liveBadge}</td>
        <td class="px-6 py-3 text-sm font-semibold text-right tabular-nums text-green-600 dark:text-green-400">${fmt(m.total_assets)}</td>
        <td class="px-6 py-3 text-sm font-semibold text-right tabular-nums ${colorClass(m.total_liabilities)}">${fmt(m.total_liabilities)}</td>
        <td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${colorClass(m.net_worth)}">${fmt(m.net_worth)}</td>
        <td class="px-6 py-3 text-sm text-right tabular-nums">${changeHtml}</td>
      </tr>`
    }).join("")

    this.tableBodyTarget.innerHTML = rows
  }

  renderChart(d) {
    if (d.months.length === 0) {
      this.chartContainerTarget.innerHTML = `<div class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">No data for this period.</div>`
      return
    }

    const W = 700, H = 350, PAD_L = 80, PAD_R = 30, PAD_T = 30, PAD_B = 60
    const plotW = W - PAD_L - PAD_R
    const plotH = H - PAD_T - PAD_B

    const values = d.months.map(m => m.net_worth)
    const minVal = Math.min(...values, 0)
    const maxVal = Math.max(...values, 0)
    const range = maxVal - minVal || 1

    function xPos(i) { return PAD_L + (d.months.length === 1 ? plotW / 2 : (i / (d.months.length - 1)) * plotW) }
    function yPos(v) { return PAD_T + plotH - ((v - minVal) / range) * plotH }

    // Grid lines
    const gridCount = 5
    let gridLines = ""
    for (let i = 0; i <= gridCount; i++) {
      const val = minVal + (range * i / gridCount)
      const y = yPos(val)
      gridLines += `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`
      gridLines += `<text x="${PAD_L - 8}" y="${y + 4}" text-anchor="end" fill="#9ca3af" font-size="10">$${Math.round(val).toLocaleString()}</text>`
    }

    // Zero line if range crosses zero
    let zeroLine = ""
    if (minVal < 0 && maxVal > 0) {
      const zy = yPos(0)
      zeroLine = `<line x1="${PAD_L}" y1="${zy}" x2="${W - PAD_R}" y2="${zy}" stroke="#6b7280" stroke-width="1" stroke-dasharray="4,4" />`
    }

    // Data line
    const points = d.months.map((m, i) => `${xPos(i)},${yPos(m.net_worth)}`).join(" ")
    const line = `<polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" />`

    // Data points + labels
    let dots = ""
    d.months.forEach((m, i) => {
      const x = xPos(i)
      const y = yPos(m.net_worth)
      const fillColor = m.net_worth >= 0 ? "#16a34a" : "#dc2626"
      dots += `<circle cx="${x}" cy="${y}" r="4" fill="${fillColor}" stroke="white" stroke-width="2">
        <title>${escapeHtml(m.label)}: ${fmt(m.net_worth)}</title>
      </circle>`
    })

    // X-axis labels
    let xLabels = ""
    const maxLabels = 12
    const step = d.months.length <= maxLabels ? 1 : Math.ceil(d.months.length / maxLabels)
    d.months.forEach((m, i) => {
      if (i % step !== 0 && i !== d.months.length - 1) return
      const x = xPos(i)
      const parts = m.label.split(" ")
      const shortLabel = parts[0].substring(0, 3) + " " + parts[1].substring(2)
      xLabels += `<text x="${x}" y="${H - PAD_B + 20}" text-anchor="middle" fill="#9ca3af" font-size="10">${shortLabel}</text>`
    })

    this.chartContainerTarget.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="w-full" xmlns="http://www.w3.org/2000/svg">
        ${gridLines}
        ${zeroLine}
        ${line}
        ${dots}
        ${xLabels}
      </svg>`
  }

  printReport() {
    if (!this._data) return
    const d = this._data
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    const filterLabel = d.in_budget_only ? "In-Budget Accounts" : "All Accounts"

    let tableRows = sortData(d.months, this._sort.field, this._sort.dir).map(m => {
      const changeStr = m.change === null ? "\u2014" : `${m.change > 0 ? "+" : ""}${fmt(m.change)}`
      const changeStyle = m.change === null ? "" : (m.change < 0 ? "color:#dc2626;" : (m.change > 0 ? "color:#16a34a;" : ""))
      const nwStyle = m.net_worth < 0 ? "color:#dc2626;" : (m.net_worth > 0 ? "color:#16a34a;" : "")
      const liabStyle = m.total_liabilities < 0 ? "color:#dc2626;" : ""
      return `<tr>
        <td>${escapeHtml(m.label)}${m.source === "live" ? " (Live)" : ""}</td>
        <td style="text-align:right;font-family:monospace;color:#16a34a;">${fmt(m.total_assets)}</td>
        <td style="text-align:right;font-family:monospace;${liabStyle}">${fmt(m.total_liabilities)}</td>
        <td style="text-align:right;font-family:monospace;font-weight:700;${nwStyle}">${fmt(m.net_worth)}</td>
        <td style="text-align:right;font-family:monospace;${changeStyle}">${changeStr}</td>
      </tr>`
    }).join("")

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MyBudgetHQ \u2013 Net Worth Report</title>
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
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 0; } @page { margin: 0.5in; } thead { display: table-header-group; } tr { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">B</div>
      <div><div class="brand">MyBudgetHQ <span>Net Worth Report</span></div></div>
    </div>
    <div class="date-printed">Printed ${escapeHtml(today)}</div>
  </div>
  <div class="meta">
    <p><strong>Accounts:</strong> ${escapeHtml(filterLabel)}</p>
    <p><strong>Date Range:</strong> ${escapeHtml(d.start_label)} to ${escapeHtml(d.end_label)}</p>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;">Month</th>
      <th style="text-align:right;">Total Assets</th>
      <th style="text-align:right;">Total Liabilities</th>
      <th style="text-align:right;">Net Worth</th>
      <th style="text-align:right;">MoM Change</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
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
