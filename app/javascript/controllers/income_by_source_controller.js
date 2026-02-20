import { Controller } from "@hotwired/stimulus"
import { fetchTags, renderTagFilterCheckboxes, tagIdsQueryString, renderAppliedTagsBanner, renderAppliedTagsPrint } from "controllers/shared/tag_filter"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const PIE_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
]

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
    "startMonthSelect", "startYearSelect", "endMonthSelect", "endYearSelect",
    "accountSelect", "includeRecurringCheckbox",
    "formatTable", "formatChart", "optionsError",
    "reportSubtitle", "tableContainer", "chartContainer",
    "tableHead", "tableBody",
    "statTotal", "statSources",
    "tagFilterContainer", "tagSearchInput", "tagCheckboxList", "appliedTagsBanner"
  ]
  static values = { apiUrl: String, accountsUrl: String, year: Number, month: Number, tagsUrl: String }

  async connect() {
    this._format = "table"
    this._selectedTagIds = []
    this._allTags = []
    this._populateDateSelectors()
    await this._fetchAccounts()
    this._ensureTagsLoaded()
  }

  // --- Tag Filter ---

  async _ensureTagsLoaded() {
    if (this._allTags.length > 0 || !this.tagsUrlValue) return
    this._allTags = await fetchTags(this.tagsUrlValue)
    if (this.hasTagFilterContainerTarget) this._renderTagFilter()
  }

  _renderTagFilter() {
    this.tagFilterContainerTarget.innerHTML = renderTagFilterCheckboxes(
      this._allTags, this._selectedTagIds, "income-by-source"
    )
  }

  onTagCheckboxChange(event) {
    const id = Number(event.target.value)
    if (event.target.checked) {
      if (!this._selectedTagIds.includes(id)) this._selectedTagIds.push(id)
    } else {
      this._selectedTagIds = this._selectedTagIds.filter(x => x !== id)
    }
  }

  onTagSearchInput() {
    if (!this.hasTagSearchInputTarget) return
    const query = this.tagSearchInputTarget.value.trim().toLowerCase()
    this.tagCheckboxListTarget.querySelectorAll(".tag-filter-item").forEach(el => {
      const name = el.dataset.tagName || ""
      el.style.display = (!query || name.includes(query)) ? "" : "none"
    })
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
      const options = this._accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("")
      this.accountSelectTarget.innerHTML = `<option value="">All Accounts</option>` + options
    } catch (e) {
      console.error("Failed to fetch accounts:", e)
    }
  }

  showOptions() {
    this.optionsErrorTarget.classList.add("hidden")
    if (this.hasTagFilterContainerTarget && this._allTags.length > 0) this._renderTagFilter()
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
      const accountId = this.accountSelectTarget.value
      const startYear = this.startYearSelectTarget.value
      const startMonth = this.startMonthSelectTarget.value
      const endYear = this.endYearSelectTarget.value
      const endMonth = this.endMonthSelectTarget.value
      const includeRecurring = this.includeRecurringCheckboxTarget.checked ? "1" : "0"

      let url = `${this.apiUrlValue}?start_year=${startYear}&start_month=${startMonth}&end_year=${endYear}&end_month=${endMonth}&include_recurring=${includeRecurring}`
      if (accountId) url += `&account_id=${accountId}`
      url += tagIdsQueryString(this._selectedTagIds)

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
    this.reportSubtitleTarget.textContent = `${escapeHtml(d.account_name)} \u2014 ${escapeHtml(d.start_label)} to ${escapeHtml(d.end_label)}`
    if (this.hasAppliedTagsBannerTarget) {
      this.appliedTagsBannerTarget.innerHTML = renderAppliedTagsBanner(d.applied_tags)
    }

    this.statTotalTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Income</div>
      <div class="text-lg font-bold text-green-600 dark:text-green-400 mt-1">${fmt(d.total_income)}</div>`
    this.statSourcesTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sources</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${d.sources.length}</div>
      <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${d.total_count} deposits</div>`

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
    if (d.sources.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No income data for this period.</td></tr>`
      return
    }

    const rows = d.sources.map((s, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length]
      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td class="px-6 py-3">
          <div class="flex items-center space-x-3">
            <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color}"></div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(s.name)}</span>
          </div>
        </td>
        <td class="px-6 py-3 text-sm font-semibold text-right text-green-600 dark:text-green-400">${fmt(s.amount)}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-500 dark:text-gray-400">${s.count}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-700 dark:text-gray-300">${s.pct.toFixed(1)}%</td>
      </tr>`
    }).join("")

    const totalRow = `<tr class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">
      <td class="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
      <td class="px-6 py-3 text-sm font-bold text-right text-green-600 dark:text-green-400">${fmt(d.total_income)}</td>
      <td class="px-6 py-3 text-sm font-bold text-right text-gray-900 dark:text-white">${d.total_count}</td>
      <td class="px-6 py-3 text-sm font-bold text-right text-gray-900 dark:text-white">100.0%</td>
    </tr>`

    this.tableBodyTarget.innerHTML = rows + totalRow
  }

  renderChart(d) {
    if (d.sources.length === 0) {
      this.chartContainerTarget.innerHTML = `<div class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">No income data for this period.</div>`
      return
    }

    const R = 120, CX = 150, CY = 150
    let startAngle = -Math.PI / 2
    let slices = ""

    d.sources.forEach((s, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length]
      const angle = (s.pct / 100) * 2 * Math.PI

      if (d.sources.length === 1) {
        slices += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="${color}"><title>${escapeHtml(s.name)}: ${fmt(s.amount)} (${s.pct.toFixed(1)}%)</title></circle>`
      } else {
        const x1 = CX + R * Math.cos(startAngle)
        const y1 = CY + R * Math.sin(startAngle)
        const x2 = CX + R * Math.cos(startAngle + angle)
        const y2 = CY + R * Math.sin(startAngle + angle)
        const largeArc = angle > Math.PI ? 1 : 0

        slices += `<path d="M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" stroke="white" stroke-width="1">
          <title>${escapeHtml(s.name)}: ${fmt(s.amount)} (${s.pct.toFixed(1)}%)</title>
        </path>`
      }
      startAngle += angle
    })

    const legend = d.sources.map((s, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length]
      return `<div class="flex items-center space-x-2 text-sm">
        <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${color}"></div>
        <span class="text-gray-900 dark:text-white font-medium">${escapeHtml(s.name)}</span>
        <span class="text-gray-500 dark:text-gray-400">${fmt(s.amount)} (${s.pct.toFixed(1)}%)</span>
      </div>`
    }).join("")

    this.chartContainerTarget.innerHTML = `
      <div class="flex flex-col sm:flex-row items-center gap-8">
        <svg viewBox="0 0 300 300" class="w-64 h-64 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
          ${slices}
        </svg>
        <div class="space-y-2">${legend}</div>
      </div>`
  }

  printReport() {
    if (!this._data) return
    const d = this._data
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    let tableRows = d.sources.map(s =>
      `<tr>
        <td>${escapeHtml(s.name)}</td>
        <td style="text-align:right;font-family:monospace;">${fmt(s.amount)}</td>
        <td style="text-align:right;">${s.count}</td>
        <td style="text-align:right;">${s.pct.toFixed(1)}%</td>
      </tr>`
    ).join("")

    tableRows += `<tr class="total-row">
      <td style="text-align:right;">Total</td>
      <td style="text-align:right;font-family:monospace;">${fmt(d.total_income)}</td>
      <td style="text-align:right;">${d.total_count}</td>
      <td style="text-align:right;">100.0%</td>
    </tr>`

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BudgetHQ \u2013 Income by Source</title>
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
    @media print { body { padding: 0; } @page { margin: 0.5in; } thead { display: table-header-group; } tr { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">B</div>
      <div><div class="brand">BudgetHQ <span>Income by Source</span></div></div>
    </div>
    <div class="date-printed">Printed ${escapeHtml(today)}</div>
  </div>
  <div class="meta">
    <p><strong>Account:</strong> ${escapeHtml(d.account_name)}</p>
    <p><strong>Date Range:</strong> ${escapeHtml(d.start_label)} to ${escapeHtml(d.end_label)}</p>
    <p><strong>Total Income:</strong> ${fmt(d.total_income)} &nbsp;|&nbsp; <strong>Sources:</strong> ${d.sources.length} &nbsp;|&nbsp; <strong>Deposits:</strong> ${d.total_count}</p>
    ${renderAppliedTagsPrint(d.applied_tags)}
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;">Source</th>
      <th style="text-align:right;">Total Amount</th>
      <th style="text-align:right;"># Deposits</th>
      <th style="text-align:right;">% of Total</th>
    </tr></thead>
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
