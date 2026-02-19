import { Controller } from "@hotwired/stimulus"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function fmt(amount) {
  if (amount === null || amount === undefined) return "\u2014"
  const n = parseFloat(amount) || 0
  const sign = n < 0 ? "-" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function balanceClass(amount) {
  const n = parseFloat(amount) || 0
  if (n < 0) return "text-red-600 dark:text-red-400"
  return "text-gray-900 dark:text-white"
}

function changeClass(amount) {
  const n = parseFloat(amount) || 0
  if (n > 0) return "text-green-600 dark:text-green-400"
  if (n < 0) return "text-red-600 dark:text-red-400"
  return "text-gray-500 dark:text-gray-400"
}

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = [
    "optionsModal", "reportContent", "accountSelect",
    "startMonthSelect", "startYearSelect", "endMonthSelect", "endYearSelect",
    "formatTable", "formatChart", "closedOnlyCheckbox", "optionsError",
    "reportSubtitle", "tableContainer", "chartContainer",
    "tableHead", "tableBody",
    "statBeginning", "statEnding", "statChange"
  ]
  static values = { apiUrl: String, accountsUrl: String, year: Number, month: Number }

  async connect() {
    this._format = "table"
    this._populateDateSelectors()
    await this._fetchAccounts()
  }

  // --- Setup ---

  _populateDateSelectors() {
    const currentYear = this.yearValue
    const currentMonth = this.monthValue

    // Month options
    const monthOptions = MONTHS.map((name, i) =>
      `<option value="${i + 1}">${name}</option>`
    ).join("")
    this.startMonthSelectTarget.innerHTML = monthOptions
    this.endMonthSelectTarget.innerHTML = monthOptions

    // Year options (current year back 5 years, forward 0)
    const years = []
    for (let y = currentYear - 5; y <= currentYear; y++) years.push(y)
    const yearOptions = years.map(y => `<option value="${y}">${y}</option>`).join("")
    this.startYearSelectTarget.innerHTML = yearOptions
    this.endYearSelectTarget.innerHTML = yearOptions

    // Defaults: Jan of current year to current open month
    this.startMonthSelectTarget.value = "1"
    this.startYearSelectTarget.value = String(currentYear)
    this.endMonthSelectTarget.value = String(currentMonth)
    this.endYearSelectTarget.value = String(currentYear)
  }

  async _fetchAccounts() {
    try {
      const res = await fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      this._accounts = await res.json()
      const options = this._accounts.map(a =>
        `<option value="${a.id}">${escapeHtml(a.name)}</option>`
      ).join("")
      this.accountSelectTarget.innerHTML = `<option value="">All Accounts</option>` + options
    } catch (e) {
      console.error("Failed to fetch accounts:", e)
    }
  }

  // --- Modal Logic ---

  showOptions() {
    this.optionsErrorTarget.classList.add("hidden")
    this.optionsModalTarget.style.display = ""
    this.reportContentTargets.forEach(el => el.style.display = "none")
  }

  runReport() {
    // Validate date range
    const startYear = parseInt(this.startYearSelectTarget.value)
    const startMonth = parseInt(this.startMonthSelectTarget.value)
    const endYear = parseInt(this.endYearSelectTarget.value)
    const endMonth = parseInt(this.endMonthSelectTarget.value)

    const startDate = new Date(startYear, startMonth - 1)
    const endDate = new Date(endYear, endMonth - 1)

    if (startDate > endDate) {
      this.optionsErrorTarget.textContent = "Start date must be before or equal to end date."
      this.optionsErrorTarget.classList.remove("hidden")
      return
    }

    // Check max 60 months
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

  // --- Data Fetching ---

  async fetchData() {
    try {
      const accountId = this.accountSelectTarget.value
      const startYear = this.startYearSelectTarget.value
      const startMonth = this.startMonthSelectTarget.value
      const endYear = this.endYearSelectTarget.value
      const endMonth = this.endMonthSelectTarget.value
      const closedOnly = this.closedOnlyCheckboxTarget.checked ? "1" : "0"

      let url = `${this.apiUrlValue}?start_year=${startYear}&start_month=${startMonth}&end_year=${endYear}&end_month=${endMonth}&closed_only=${closedOnly}`
      if (accountId) url += `&account_id=${accountId}`

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
    this.reportSubtitleTarget.textContent = `${escapeHtml(d.account_name)} \u2014 ${escapeHtml(d.start_label)} to ${escapeHtml(d.end_label)}`

    // Summary stats from first and last valid months
    const validMonths = d.months.filter(m => m.beginning_balance !== null)
    if (validMonths.length > 0) {
      const first = validMonths[0]
      const last = validMonths[validMonths.length - 1]
      const totalChange = (last.ending_balance - first.beginning_balance).toFixed(2)

      this.statBeginningTarget.innerHTML = `
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">First Beginning</div>
        <div class="text-lg font-bold ${balanceClass(first.beginning_balance)} mt-1">${fmt(first.beginning_balance)}</div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${escapeHtml(first.label)}</div>`
      this.statEndingTarget.innerHTML = `
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Ending</div>
        <div class="text-lg font-bold ${balanceClass(last.ending_balance)} mt-1">${fmt(last.ending_balance)}</div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${escapeHtml(last.label)}</div>`
      this.statChangeTarget.innerHTML = `
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Change</div>
        <div class="text-lg font-bold ${changeClass(totalChange)} mt-1">${fmt(totalChange)}</div>`
    } else {
      this.statBeginningTarget.innerHTML = `<div class="text-sm text-gray-400 py-2">No data</div>`
      this.statEndingTarget.innerHTML = `<div class="text-sm text-gray-400 py-2">No data</div>`
      this.statChangeTarget.innerHTML = `<div class="text-sm text-gray-400 py-2">No data</div>`
    }

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
    if (d.months.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No balance data for this period.</td></tr>`
      return
    }

    const rows = d.months.map(m => {
      const noData = m.beginning_balance === null
      if (noData) {
        return `<tr class="border-b border-gray-100 dark:border-gray-700">
          <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(m.label)}</td>
          <td class="px-6 py-3 text-sm text-right text-gray-400 dark:text-gray-500" colspan="3">No snapshot data</td>
        </tr>`
      }
      const sourceTag = m.source === "live"
        ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Live</span>`
        : ""
      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(m.label)}${sourceTag}</td>
        <td class="px-6 py-3 text-sm font-semibold text-right ${balanceClass(m.beginning_balance)}">${fmt(m.beginning_balance)}</td>
        <td class="px-6 py-3 text-sm font-semibold text-right ${balanceClass(m.ending_balance)}">${fmt(m.ending_balance)}</td>
        <td class="px-6 py-3 text-sm font-medium text-right ${changeClass(m.change)}">${fmt(m.change)}</td>
      </tr>`
    }).join("")

    this.tableBodyTarget.innerHTML = rows
  }

  renderChart(d) {
    const validMonths = d.months.filter(m => m.ending_balance !== null)
    if (validMonths.length === 0) {
      this.chartContainerTarget.innerHTML = `<div class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">No balance data for this period.</div>`
      return
    }

    const W = 700, H = 350
    const PAD = { top: 20, right: 30, bottom: 60, left: 80 }
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom

    const values = validMonths.map(m => m.ending_balance)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1
    const yMin = minVal - range * 0.1
    const yMax = maxVal + range * 0.1
    const yRange = yMax - yMin || 1

    const xScale = (i) => PAD.left + (validMonths.length === 1 ? plotW / 2 : (i / (validMonths.length - 1)) * plotW)
    const yScale = (v) => PAD.top + plotH - ((v - yMin) / yRange) * plotH

    // Grid lines (5 horizontal)
    let gridLines = ""
    let yLabels = ""
    for (let i = 0; i <= 4; i++) {
      const val = yMin + (i / 4) * yRange
      const y = yScale(val)
      gridLines += `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`
      yLabels += `<text x="${PAD.left - 8}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="10">${fmt(val)}</text>`
    }

    // Data points and line
    const points = validMonths.map((m, i) => `${xScale(i)},${yScale(m.ending_balance)}`).join(" ")
    const dots = validMonths.map((m, i) => {
      const x = xScale(i)
      const y = yScale(m.ending_balance)
      return `<circle cx="${x}" cy="${y}" r="4" fill="#2563eb" stroke="white" stroke-width="2"/>
        <title>${escapeHtml(m.label)}: ${fmt(m.ending_balance)}</title>`
    }).join("")

    // X-axis labels
    const maxLabels = Math.min(validMonths.length, 12)
    const step = Math.max(1, Math.ceil(validMonths.length / maxLabels))
    let xLabels = ""
    for (let i = 0; i < validMonths.length; i += step) {
      const x = xScale(i)
      const parts = validMonths[i].label.split(" ")
      const shortLabel = parts[0].substring(0, 3) + " " + parts[1]
      xLabels += `<text x="${x}" y="${H - PAD.bottom + 18}" text-anchor="middle" fill="#6b7280" font-size="10" transform="rotate(-30 ${x} ${H - PAD.bottom + 18})">${escapeHtml(shortLabel)}</text>`
    }

    const svg = `<svg viewBox="0 0 ${W} ${H}" class="w-full" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      ${yLabels}
      <polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      ${xLabels}
      <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + plotH}" stroke="#d1d5db" stroke-width="1"/>
      <line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${W - PAD.right}" y2="${PAD.top + plotH}" stroke="#d1d5db" stroke-width="1"/>
    </svg>`

    this.chartContainerTarget.innerHTML = `
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Ending Balance by Month</h3>
      ${svg}`
  }

  // --- Print ---

  printReport() {
    if (!this._data) return
    const d = this._data
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    let tableRows = ""
    if (d.months.length === 0) {
      tableRows = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af;">No balance data for this period.</td></tr>`
    } else {
      tableRows = d.months.map(m => {
        if (m.beginning_balance === null) {
          return `<tr><td>${escapeHtml(m.label)}</td><td colspan="3" style="text-align:center;color:#9ca3af;">No snapshot data</td></tr>`
        }
        const changeStyle = m.change > 0 ? "color:#16a34a;" : m.change < 0 ? "color:#dc2626;" : ""
        return `<tr>
          <td>${escapeHtml(m.label)}${m.source === "live" ? " (Live)" : ""}</td>
          <td style="text-align:right;font-family:monospace;">${fmt(m.beginning_balance)}</td>
          <td style="text-align:right;font-family:monospace;">${fmt(m.ending_balance)}</td>
          <td style="text-align:right;font-family:monospace;${changeStyle}">${fmt(m.change)}</td>
        </tr>`
      }).join("")
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BudgetHQ \u2013 Account Balance History</title>
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
        <div class="brand">BudgetHQ <span>Account Balance History</span></div>
      </div>
    </div>
    <div class="date-printed">Printed ${escapeHtml(today)}</div>
  </div>

  <div class="meta">
    <p><strong>Account:</strong> ${escapeHtml(d.account_name)}</p>
    <p><strong>Date Range:</strong> ${escapeHtml(d.start_label)} to ${escapeHtml(d.end_label)}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Month</th>
        <th style="text-align:right;">Beginning Balance</th>
        <th style="text-align:right;">Ending Balance</th>
        <th style="text-align:right;">Change</th>
      </tr>
    </thead>
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
