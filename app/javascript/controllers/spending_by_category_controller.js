import { Controller } from "@hotwired/stimulus"
import { renderIconSvg } from "controllers/shared/icon_catalog"
import { fetchTags, renderTagFilterCheckboxes, tagIdsQueryString, renderAppliedTagsBanner, renderAppliedTagsPrint } from "controllers/shared/tag_filter"
import { sortTh, sortData, nextSortState } from "controllers/shared/report_sort"

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

function varianceClass(amount) {
  const n = parseFloat(amount) || 0
  if (n > 0) return "text-red-600 dark:text-red-400"
  if (n < 0) return "text-green-600 dark:text-green-400"
  return "text-gray-500 dark:text-gray-400"
}

function fmtPct(pct) {
  if (pct === null || pct === undefined) return "\u2014"
  const sign = pct > 0 ? "+" : ""
  return sign + pct.toFixed(1) + "%"
}

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = [
    "optionsModal", "typeRegular", "typeComparison", "comparisonOptions",
    "comparePrev", "includeYtd", "comparisonError",
    "reportContent", "monthLabel", "modeLabel", "summaryHead", "summaryBody",
    "statTotal", "statCount",
    "tagFilterContainer", "tagSearchInput", "tagCheckboxList", "appliedTagsBanner"
  ]
  static values = { apiUrl: String, year: Number, month: Number, monthLabel: String, tagsUrl: String }

  connect() {
    this._mode = "regular"
    this._comparePrev = true
    this._includeYtd = false
    this._selectedTagIds = []
    this._allTags = []
    this._sort = { field: "amount", dir: "desc" }
    this._ensureTagsLoaded()
  }

  toggleSort(event) {
    const f = event.currentTarget.dataset.sortField
    if (!f) return
    this._sort = nextSortState(f, this._sort.field, this._sort.dir)
    if (this._data) this.render()
  }

  // --- Tag Filter ---

  async _ensureTagsLoaded() {
    if (this._allTags.length > 0 || !this.tagsUrlValue) return
    this._allTags = await fetchTags(this.tagsUrlValue)
    if (this.hasTagFilterContainerTarget) this._renderTagFilter()
  }

  _renderTagFilter() {
    this.tagFilterContainerTarget.innerHTML = renderTagFilterCheckboxes(
      this._allTags, this._selectedTagIds, "spending-by-category"
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

  // --- Modal Logic ---

  onTypeChange() {
    const isComparison = this.typeComparisonTarget.checked
    if (isComparison) {
      this.comparisonOptionsTarget.classList.remove("hidden")
    } else {
      this.comparisonOptionsTarget.classList.add("hidden")
      this.comparisonErrorTarget.classList.add("hidden")
    }
  }

  showOptions() {
    if (this._mode === "comparison") {
      this.typeComparisonTarget.checked = true
      this.typeRegularTarget.checked = false
      this.comparisonOptionsTarget.classList.remove("hidden")
      this.comparePrevTarget.checked = this._comparePrev
      this.includeYtdTarget.checked = this._includeYtd
    } else {
      this.typeRegularTarget.checked = true
      this.typeComparisonTarget.checked = false
      this.comparisonOptionsTarget.classList.add("hidden")
    }
    this.comparisonErrorTarget.classList.add("hidden")
    if (this.hasTagFilterContainerTarget && this._allTags.length > 0) this._renderTagFilter()
    this.optionsModalTarget.style.display = ""
    this.reportContentTargets.forEach(el => el.style.display = "none")
  }

  runReport() {
    const isComparison = this.typeComparisonTarget.checked

    if (isComparison) {
      const prev = this.comparePrevTarget.checked
      const ytd = this.includeYtdTarget.checked
      if (!prev && !ytd) {
        this.comparisonErrorTarget.classList.remove("hidden")
        return
      }
      this.comparisonErrorTarget.classList.add("hidden")
      this._mode = "comparison"
      this._comparePrev = prev
      this._includeYtd = ytd
    } else {
      this._mode = "regular"
    }

    this.optionsModalTarget.style.display = "none"
    this.reportContentTargets.forEach(el => el.style.display = "")
    this.fetchData()
  }

  // --- Data Fetching ---

  async fetchData() {
    try {
      let url = `${this.apiUrlValue}?year=${this.yearValue}&month=${this.monthValue}&mode=${this._mode}`
      if (this._mode === "comparison") {
        if (this._comparePrev) url += "&compare_prev=1"
        if (this._includeYtd) url += "&include_ytd=1"
      }
      url += tagIdsQueryString(this._selectedTagIds)
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
    if (this.hasAppliedTagsBannerTarget) {
      this.appliedTagsBannerTarget.innerHTML = renderAppliedTagsBanner(d.applied_tags)
    }

    if (this._mode === "comparison") {
      this.modeLabelTarget.textContent = "Comparison"
      this.renderComparison(d)
    } else {
      this.modeLabelTarget.textContent = "Regular"
      this.renderRegular(d)
    }
  }

  renderRegular(d) {
    // Summary stats
    this.statTotalTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${fmt(d.total_spent)}</div>`
    this.statCountTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${d.transaction_count}</div>`

    // Table header
    this.summaryHeadTarget.innerHTML = `<tr>
      ${sortTh("Category", "name", this._sort, "spending-by-category", "left")}
      ${sortTh("Spending Type", "spending_type", this._sort, "spending-by-category", "left")}
      ${sortTh("Amount", "amount", this._sort, "spending-by-category", "right")}
      ${sortTh("% of Total", "pct", this._sort, "spending-by-category", "right")}
      ${sortTh("# Trans", "count", this._sort, "spending-by-category", "right")}
    </tr>`

    if (d.categories.length === 0) {
      this.summaryBodyTarget.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No spending data for this month.</td></tr>`
      return
    }

    const sorted = sortData(d.categories, this._sort.field, this._sort.dir)
    const rows = sorted.map(c => {
      const icon = c.icon_key ? renderIconSvg(c.icon_key, c.color_key || "blue", "h-5 w-5") : ""
      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td class="px-6 py-3">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">${icon}</div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(c.name)}</span>
          </div>
        </td>
        <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(c.spending_type)}</td>
        <td class="px-6 py-3 text-sm font-semibold text-right tabular-nums ${amountClass(c.amount)}">${fmt(c.amount)}</td>
        <td class="px-6 py-3 text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">${c.pct.toFixed(1)}%</td>
        <td class="px-6 py-3 text-sm text-right tabular-nums text-gray-500 dark:text-gray-400">${c.count}</td>
      </tr>`
    }).join("")

    const totalRow = `<tr class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">
      <td class="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white" colspan="2">Total</td>
      <td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${amountClass(d.total_spent)}">${fmt(d.total_spent)}</td>
      <td class="px-6 py-3 text-sm font-bold text-right tabular-nums text-gray-900 dark:text-white">100.0%</td>
      <td class="px-6 py-3 text-sm font-bold text-right tabular-nums text-gray-900 dark:text-white">${d.transaction_count}</td>
    </tr>`

    this.summaryBodyTarget.innerHTML = rows + totalRow
  }

  renderComparison(d) {
    const hasPrev = !!d.prev
    const hasYtd = !!d.ytd

    // Summary stats
    this.statTotalTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${fmt(d.total_spent)}</div>`
    this.statCountTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${d.transaction_count}</div>`

    // Dynamic header
    const thClass = "px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
    let headCols = `<th class="${thClass} text-left">Category</th>
      <th class="${thClass} text-right">${escapeHtml(d.month_label)}</th>`
    if (hasPrev) {
      headCols += `<th class="${thClass} text-right">${escapeHtml(d.prev.month_label)}</th>
        <th class="${thClass} text-right">Var ($)</th>
        <th class="${thClass} text-right">Var (%)</th>`
    }
    if (hasYtd) {
      headCols += `<th class="${thClass} text-right">${escapeHtml(d.ytd.label)}</th>`
    }
    this.summaryHeadTarget.innerHTML = `<tr>${headCols}</tr>`

    // Build unified category list
    const currMap = {}
    d.categories.forEach(c => { currMap[c.name] = c })
    const prevMap = {}
    if (hasPrev) d.prev.categories.forEach(c => { prevMap[c.name] = c })
    const ytdMap = {}
    if (hasYtd) d.ytd.categories.forEach(c => { ytdMap[c.name] = c })
    const varMap = {}
    if (d.variance) d.variance.categories.forEach(c => { varMap[c.name] = c })

    const allNames = [...new Set([
      ...Object.keys(currMap),
      ...Object.keys(prevMap),
      ...Object.keys(ytdMap)
    ])]
    // Sort by current month amount desc
    allNames.sort((a, b) => (currMap[b]?.amount || 0) - (currMap[a]?.amount || 0))

    if (allNames.length === 0) {
      this.summaryBodyTarget.innerHTML = `<tr><td colspan="${hasPrev ? (hasYtd ? 6 : 5) : (hasYtd ? 3 : 2)}" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No spending data for this period.</td></tr>`
      return
    }

    const rows = allNames.map(name => {
      const curr = currMap[name]
      const prev = prevMap[name]
      const v = varMap[name]
      const ytd = ytdMap[name]
      const ref = curr || prev || ytd
      const icon = ref?.icon_key ? renderIconSvg(ref.icon_key, ref.color_key || "blue", "h-5 w-5") : ""

      let cols = `<td class="px-6 py-3">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">${icon}</div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(name)}</span>
          </div>
        </td>
        <td class="px-6 py-3 text-sm font-semibold text-right tabular-nums ${amountClass(curr?.amount || 0)}">${fmt(curr?.amount || 0)}</td>`

      if (hasPrev) {
        cols += `<td class="px-6 py-3 text-sm text-right tabular-nums ${amountClass(prev?.amount || 0)}">${fmt(prev?.amount || 0)}</td>
          <td class="px-6 py-3 text-sm font-medium text-right tabular-nums ${varianceClass(v?.dollar)}">${v ? fmt(v.dollar) : "\u2014"}</td>
          <td class="px-6 py-3 text-sm font-medium text-right tabular-nums ${varianceClass(v?.dollar)}">${v ? fmtPct(v.percent) : "\u2014"}</td>`
      }

      if (hasYtd) {
        cols += `<td class="px-6 py-3 text-sm text-right tabular-nums ${amountClass(ytd?.amount || 0)}">${fmt(ytd?.amount || 0)}</td>`
      }

      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">${cols}</tr>`
    }).join("")

    // Totals row
    const totalVar = d.variance?.total
    let totalCols = `<td class="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
      <td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${amountClass(d.total_spent)}">${fmt(d.total_spent)}</td>`
    if (hasPrev) {
      totalCols += `<td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${amountClass(d.prev.total_spent)}">${fmt(d.prev.total_spent)}</td>
        <td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${varianceClass(totalVar?.dollar)}">${totalVar ? fmt(totalVar.dollar) : "\u2014"}</td>
        <td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${varianceClass(totalVar?.dollar)}">${totalVar ? fmtPct(totalVar.percent) : "\u2014"}</td>`
    }
    if (hasYtd) {
      totalCols += `<td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${amountClass(d.ytd.total_spent)}">${fmt(d.ytd.total_spent)}</td>`
    }

    const totalRow = `<tr class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">${totalCols}</tr>`

    this.summaryBodyTarget.innerHTML = rows + totalRow
  }

  // --- Print ---

  printReport() {
    if (!this._data) return
    const d = this._data
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    const modeText = this._mode === "comparison" ? "Comparison" : "Regular (This Month)"

    let tableHead = ""
    let tableRows = ""

    if (this._mode === "regular") {
      tableHead = `<tr>
        <th style="text-align:left;">Category</th>
        <th style="text-align:left;">Spending Type</th>
        <th style="text-align:right;">Amount</th>
        <th style="text-align:right;">% of Total</th>
        <th style="text-align:right;"># Trans</th>
      </tr>`

      tableRows = sortData(d.categories, this._sort.field, this._sort.dir).map(c =>
        `<tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.spending_type)}</td>
          <td style="text-align:right;font-family:monospace;">${fmt(c.amount)}</td>
          <td style="text-align:right;">${c.pct.toFixed(1)}%</td>
          <td style="text-align:right;">${c.count}</td>
        </tr>`
      ).join("")

      tableRows += `<tr class="total-row">
        <td colspan="2" style="text-align:right;">Total</td>
        <td style="text-align:right;font-family:monospace;">${fmt(d.total_spent)}</td>
        <td style="text-align:right;">100.0%</td>
        <td style="text-align:right;">${d.transaction_count}</td>
      </tr>`
    } else {
      const hasPrev = !!d.prev
      const hasYtd = !!d.ytd
      const currMap = {}
      d.categories.forEach(c => { currMap[c.name] = c })
      const prevMap = {}
      if (hasPrev) d.prev.categories.forEach(c => { prevMap[c.name] = c })
      const ytdMap = {}
      if (hasYtd) d.ytd.categories.forEach(c => { ytdMap[c.name] = c })
      const varMap = {}
      if (d.variance) d.variance.categories.forEach(c => { varMap[c.name] = c })

      let headCols = `<th style="text-align:left;">Category</th><th style="text-align:right;">${escapeHtml(d.month_label)}</th>`
      if (hasPrev) headCols += `<th style="text-align:right;">${escapeHtml(d.prev.month_label)}</th><th style="text-align:right;">Var ($)</th><th style="text-align:right;">Var (%)</th>`
      if (hasYtd) headCols += `<th style="text-align:right;">${escapeHtml(d.ytd.label)}</th>`
      tableHead = `<tr>${headCols}</tr>`

      const allNames = [...new Set([...Object.keys(currMap), ...Object.keys(prevMap), ...Object.keys(ytdMap)])]
      allNames.sort((a, b) => (currMap[b]?.amount || 0) - (currMap[a]?.amount || 0))

      tableRows = allNames.map(name => {
        const curr = currMap[name]
        const prev = prevMap[name]
        const v = varMap[name]
        const ytd = ytdMap[name]
        let cols = `<td>${escapeHtml(name)}</td><td style="text-align:right;font-family:monospace;">${fmt(curr?.amount || 0)}</td>`
        if (hasPrev) cols += `<td style="text-align:right;font-family:monospace;">${fmt(prev?.amount || 0)}</td><td style="text-align:right;font-family:monospace;">${v ? fmt(v.dollar) : "\u2014"}</td><td style="text-align:right;">${v ? fmtPct(v.percent) : "\u2014"}</td>`
        if (hasYtd) cols += `<td style="text-align:right;font-family:monospace;">${fmt(ytd?.amount || 0)}</td>`
        return `<tr>${cols}</tr>`
      }).join("")

      const totalVar = d.variance?.total
      let totalCols = `<td style="text-align:right;"><strong>Total</strong></td><td style="text-align:right;font-family:monospace;"><strong>${fmt(d.total_spent)}</strong></td>`
      if (hasPrev) totalCols += `<td style="text-align:right;font-family:monospace;"><strong>${fmt(d.prev.total_spent)}</strong></td><td style="text-align:right;font-family:monospace;"><strong>${totalVar ? fmt(totalVar.dollar) : "\u2014"}</strong></td><td style="text-align:right;"><strong>${totalVar ? fmtPct(totalVar.percent) : "\u2014"}</strong></td>`
      if (hasYtd) totalCols += `<td style="text-align:right;font-family:monospace;"><strong>${fmt(d.ytd.total_spent)}</strong></td>`
      tableRows += `<tr class="total-row">${totalCols}</tr>`
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MyBudgetHQ \u2013 Spending by Category</title>
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
        <div class="brand">MyBudgetHQ <span>Spending by Category</span></div>
      </div>
    </div>
    <div class="date-printed">Printed ${escapeHtml(today)}</div>
  </div>

  <div class="meta">
    <p><strong>Month:</strong> ${escapeHtml(d.month_label)}</p>
    <p><strong>Report Type:</strong> ${escapeHtml(modeText)}</p>
    <p><strong>Total Spent:</strong> ${fmt(d.total_spent)} &nbsp;|&nbsp; <strong>Transactions:</strong> ${d.transaction_count}</p>
    ${renderAppliedTagsPrint(d.applied_tags)}
  </div>

  <table>
    <thead>${tableHead}</thead>
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
