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

// Tag color dot CSS classes (matching tag_filter.js pattern)
const TAG_COLORS = {
  blue: "bg-blue-500", green: "bg-green-500", gold: "bg-yellow-500", red: "bg-red-500",
  purple: "bg-purple-500", pink: "bg-pink-500", indigo: "bg-indigo-500", teal: "bg-teal-500",
  orange: "bg-orange-500", gray: "bg-gray-400"
}

function tagDot(colorKey) {
  const cls = TAG_COLORS[colorKey] || TAG_COLORS.gray
  return `<span class="inline-block w-3 h-3 rounded-full ${cls} flex-shrink-0"></span>`
}

export default class extends Controller {
  static targets = [
    "optionsModal", "typeRegular", "typeComparison", "comparisonOptions",
    "comparePrev", "includeYtd", "comparisonError",
    "reportContent", "monthLabel", "modeLabel", "summaryHead", "summaryBody",
    "statTotal", "statCount"
  ]
  static values = { apiUrl: String, year: Number, month: Number, monthLabel: String }

  connect() {
    this._mode = "regular"
    this._comparePrev = true
    this._includeYtd = false
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

    if (this._mode === "comparison") {
      this.modeLabelTarget.textContent = "Comparison"
      this.renderComparison(d)
    } else {
      this.modeLabelTarget.textContent = "Regular"
      this.renderRegular(d)
    }
  }

  renderRegular(d) {
    this.statTotalTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${fmt(d.total_spent)}</div>`
    this.statCountTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${d.transaction_count}</div>`

    this.summaryHeadTarget.innerHTML = `<tr>
      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tag</th>
      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">% of Total</th>
      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"># Trans</th>
    </tr>`

    if (d.tags.length === 0) {
      this.summaryBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No tagged spending data for this month.</td></tr>`
      return
    }

    const rows = d.tags.map(t => {
      const dot = tagDot(t.color_key)
      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td class="px-6 py-3">
          <div class="flex items-center space-x-3">
            ${dot}
            <span class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(t.name)}</span>
          </div>
        </td>
        <td class="px-6 py-3 text-sm font-semibold text-right ${amountClass(t.amount)}">${fmt(t.amount)}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-700 dark:text-gray-300">${t.pct.toFixed(1)}%</td>
        <td class="px-6 py-3 text-sm text-right text-gray-500 dark:text-gray-400">${t.count}</td>
      </tr>`
    }).join("")

    const totalRow = `<tr class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">
      <td class="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
      <td class="px-6 py-3 text-sm font-bold text-right ${amountClass(d.total_spent)}">${fmt(d.total_spent)}</td>
      <td class="px-6 py-3 text-sm font-bold text-right text-gray-900 dark:text-white">100.0%</td>
      <td class="px-6 py-3 text-sm font-bold text-right text-gray-900 dark:text-white">${d.transaction_count}</td>
    </tr>`

    this.summaryBodyTarget.innerHTML = rows + totalRow
  }

  renderComparison(d) {
    const hasPrev = !!d.prev
    const hasYtd = !!d.ytd

    this.statTotalTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${fmt(d.total_spent)}</div>`
    this.statCountTarget.innerHTML = `
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</div>
      <div class="text-lg font-bold text-gray-900 dark:text-white mt-1">${d.transaction_count}</div>`

    const thClass = "px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
    let headCols = `<th class="${thClass} text-left">Tag</th>
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

    const currMap = {}
    d.tags.forEach(t => { currMap[t.name] = t })
    const prevMap = {}
    if (hasPrev) d.prev.tags.forEach(t => { prevMap[t.name] = t })
    const ytdMap = {}
    if (hasYtd) d.ytd.tags.forEach(t => { ytdMap[t.name] = t })
    const varMap = {}
    if (d.variance) d.variance.tags.forEach(t => { varMap[t.name] = t })

    const allNames = [...new Set([
      ...Object.keys(currMap),
      ...Object.keys(prevMap),
      ...Object.keys(ytdMap)
    ])]
    allNames.sort((a, b) => (currMap[b]?.amount || 0) - (currMap[a]?.amount || 0))

    if (allNames.length === 0) {
      this.summaryBodyTarget.innerHTML = `<tr><td colspan="${hasPrev ? (hasYtd ? 6 : 5) : (hasYtd ? 3 : 2)}" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No tagged spending data for this period.</td></tr>`
      return
    }

    const rows = allNames.map(name => {
      const curr = currMap[name]
      const prev = prevMap[name]
      const v = varMap[name]
      const ytd = ytdMap[name]
      const ref = curr || prev || ytd
      const dot = tagDot(ref?.color_key)

      let cols = `<td class="px-6 py-3">
          <div class="flex items-center space-x-3">
            ${dot}
            <span class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(name)}</span>
          </div>
        </td>
        <td class="px-6 py-3 text-sm font-semibold text-right ${amountClass(curr?.amount || 0)}">${fmt(curr?.amount || 0)}</td>`

      if (hasPrev) {
        cols += `<td class="px-6 py-3 text-sm text-right ${amountClass(prev?.amount || 0)}">${fmt(prev?.amount || 0)}</td>
          <td class="px-6 py-3 text-sm font-medium text-right ${varianceClass(v?.dollar)}">${v ? fmt(v.dollar) : "\u2014"}</td>
          <td class="px-6 py-3 text-sm font-medium text-right ${varianceClass(v?.dollar)}">${v ? fmtPct(v.percent) : "\u2014"}</td>`
      }

      if (hasYtd) {
        cols += `<td class="px-6 py-3 text-sm text-right ${amountClass(ytd?.amount || 0)}">${fmt(ytd?.amount || 0)}</td>`
      }

      return `<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">${cols}</tr>`
    }).join("")

    const totalVar = d.variance?.total
    let totalCols = `<td class="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
      <td class="px-6 py-3 text-sm font-bold text-right ${amountClass(d.total_spent)}">${fmt(d.total_spent)}</td>`
    if (hasPrev) {
      totalCols += `<td class="px-6 py-3 text-sm font-bold text-right ${amountClass(d.prev.total_spent)}">${fmt(d.prev.total_spent)}</td>
        <td class="px-6 py-3 text-sm font-bold text-right ${varianceClass(totalVar?.dollar)}">${totalVar ? fmt(totalVar.dollar) : "\u2014"}</td>
        <td class="px-6 py-3 text-sm font-bold text-right ${varianceClass(totalVar?.dollar)}">${totalVar ? fmtPct(totalVar.percent) : "\u2014"}</td>`
    }
    if (hasYtd) {
      totalCols += `<td class="px-6 py-3 text-sm font-bold text-right ${amountClass(d.ytd.total_spent)}">${fmt(d.ytd.total_spent)}</td>`
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
        <th style="text-align:left;">Tag</th>
        <th style="text-align:right;">Amount</th>
        <th style="text-align:right;">% of Total</th>
        <th style="text-align:right;"># Trans</th>
      </tr>`

      tableRows = d.tags.map(t =>
        `<tr>
          <td>${escapeHtml(t.name)}</td>
          <td style="text-align:right;font-family:monospace;">${fmt(t.amount)}</td>
          <td style="text-align:right;">${t.pct.toFixed(1)}%</td>
          <td style="text-align:right;">${t.count}</td>
        </tr>`
      ).join("")

      tableRows += `<tr class="total-row">
        <td style="text-align:right;">Total</td>
        <td style="text-align:right;font-family:monospace;">${fmt(d.total_spent)}</td>
        <td style="text-align:right;">100.0%</td>
        <td style="text-align:right;">${d.transaction_count}</td>
      </tr>`
    } else {
      const hasPrev = !!d.prev
      const hasYtd = !!d.ytd
      const currMap = {}
      d.tags.forEach(t => { currMap[t.name] = t })
      const prevMap = {}
      if (hasPrev) d.prev.tags.forEach(t => { prevMap[t.name] = t })
      const ytdMap = {}
      if (hasYtd) d.ytd.tags.forEach(t => { ytdMap[t.name] = t })
      const varMap = {}
      if (d.variance) d.variance.tags.forEach(t => { varMap[t.name] = t })

      let headCols = `<th style="text-align:left;">Tag</th><th style="text-align:right;">${escapeHtml(d.month_label)}</th>`
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
  <title>MyBudgetHQ \u2013 Spending by Tag</title>
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
        <div class="brand">MyBudgetHQ <span>Spending by Tag</span></div>
      </div>
    </div>
    <div class="date-printed">Printed ${escapeHtml(today)}</div>
  </div>

  <div class="meta">
    <p><strong>Month:</strong> ${escapeHtml(d.month_label)}</p>
    <p><strong>Report Type:</strong> ${escapeHtml(modeText)}</p>
    <p><strong>Total Spent:</strong> ${fmt(d.total_spent)} &nbsp;|&nbsp; <strong>Transactions:</strong> ${d.transaction_count}</p>
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
