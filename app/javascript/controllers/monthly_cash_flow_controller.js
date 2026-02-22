import { Controller } from "@hotwired/stimulus"
import { sortTh, sortData, nextSortState } from "controllers/shared/report_sort"
import { fetchTags, renderTagFilterCheckboxes, tagIdsQueryString, renderAppliedTagsBanner } from "controllers/shared/tag_filter"

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
  if (n > 0) return "text-green-600 dark:text-green-400"
  if (n < 0) return "text-red-600 dark:text-red-400"
  return "text-gray-500 dark:text-gray-400"
}

function fmtPct(pct) {
  if (pct === null || pct === undefined) return "—"
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
    "detailsSection",
    "tagFilterContainer", "tagSearchInput", "tagCheckboxList", "appliedTagsBanner"
  ]
  static values = { apiUrl: String, year: Number, month: Number, monthLabel: String, tagsUrl: String }

  connect() {
    this._depositsOpen = false
    this._paymentsOpen = false
    this._mode = "regular"
    this._comparePrev = true
    this._includeYtd = false
    this._selectedTagIds = []
    this._allTags = []
    this._sort = { field: "name", dir: "asc" }
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
      this._allTags, this._selectedTagIds, "monthly-cash-flow"
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
    // Reset modal to match current settings
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

    this.detailsSectionTarget.innerHTML = `
      ${this._renderDetailSection("Deposits by Account", d.deposits_by_account, this._depositsOpen, "deposits", "green")}
      ${this._renderDetailSection("Payments by Category", d.payments_by_category, this._paymentsOpen, "payments", "red")}`
  }

  renderRegular(d) {
    this.summaryHeadTarget.innerHTML = `<tr>
      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
    </tr>`

    this.summaryBodyTarget.innerHTML = `
      ${this._summaryRow("Beginning Balance", d.beginning_balance, "")}
      ${this._summaryRow("Total Deposits", d.total_deposits, "deposit")}
      ${d.new_accounts_total ? this._summaryRow("New Account Starting Balances", d.new_accounts_total, "deposit") : ""}
      ${this._summaryRow("Total Payments", d.total_payments, "payment")}
      ${this._summaryRow("Net Cash Flow", d.net_cash_flow, "net")}
      ${this._summaryRow("Ending Balance", d.ending_balance, "ending")}`
  }

  renderComparison(d) {
    const hasPrev = !!d.prev
    const hasYtd = !!d.ytd

    // Build header
    let headCols = `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${escapeHtml(d.month_label)}</th>`
    if (hasPrev) {
      headCols += `<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${escapeHtml(d.prev.month_label)}</th>
        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Var ($)</th>
        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Var (%)</th>`
    }
    if (hasYtd) {
      headCols += `<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${escapeHtml(d.ytd.label)}</th>`
    }
    this.summaryHeadTarget.innerHTML = `<tr>${headCols}</tr>`

    // Build rows
    const fields = [
      { key: "beginning_balance", label: "Beginning Balance", style: "" },
      { key: "total_deposits", label: "Total Deposits", style: "deposit" },
      { key: "new_accounts_total", label: "New Account Starting Balances", style: "deposit", conditional: true },
      { key: "total_payments", label: "Total Payments", style: "payment" },
      { key: "net_cash_flow", label: "Net Cash Flow", style: "net" },
      { key: "ending_balance", label: "Ending Balance", style: "ending" }
    ]

    this.summaryBodyTarget.innerHTML = fields.map(f => {
      if (f.conditional && !d[f.key] && !(d.prev && d.prev[f.key])) return ""
      return this._comparisonRow(f.label, f.key, d, f.style)
    }).join("")
  }

  _summaryRow(label, amount, style) {
    let rowClass = "border-b border-gray-100 dark:border-gray-700"
    let labelClass = "text-sm font-medium text-gray-900 dark:text-white"
    let valueClass = `text-sm font-semibold text-right ${amountClass(amount)}`
    let icon = ""

    if (style === "deposit") {
      rowClass += " bg-green-50/50 dark:bg-green-900/10"
      labelClass = "text-sm font-medium text-green-700 dark:text-green-400"
      valueClass = "text-sm font-semibold text-right text-green-700 dark:text-green-400"
      icon = `<svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>`
    } else if (style === "payment") {
      rowClass += " bg-red-50/50 dark:bg-red-900/10"
      labelClass = "text-sm font-medium text-red-700 dark:text-red-400"
      valueClass = "text-sm font-semibold text-right text-red-700 dark:text-red-400"
      icon = `<svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"/></svg>`
    } else if (style === "net") {
      rowClass = "border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
      labelClass = "text-sm font-bold text-gray-900 dark:text-white"
      valueClass = `text-sm font-bold text-right ${amountClass(amount)}`
    } else if (style === "ending") {
      rowClass = "bg-brand-50/50 dark:bg-brand-900/10"
      labelClass = "text-sm font-bold text-brand-700 dark:text-brand-400"
      valueClass = `text-sm font-bold text-right ${amountClass(amount)}`
    }

    return `<tr class="${rowClass}">
      <td class="px-6 py-4 ${labelClass}"><span class="inline-flex items-center">${icon}${label}</span></td>
      <td class="px-6 py-4 ${valueClass}">${fmt(amount)}</td>
    </tr>`
  }

  _comparisonRow(label, key, d, style) {
    const hasPrev = !!d.prev
    const hasYtd = !!d.ytd
    const current = d[key]

    let rowClass = "border-b border-gray-100 dark:border-gray-700"
    let labelClass = "text-sm font-medium text-gray-900 dark:text-white"

    if (style === "deposit") {
      rowClass += " bg-green-50/50 dark:bg-green-900/10"
      labelClass = "text-sm font-medium text-green-700 dark:text-green-400"
    } else if (style === "payment") {
      rowClass += " bg-red-50/50 dark:bg-red-900/10"
      labelClass = "text-sm font-medium text-red-700 dark:text-red-400"
    } else if (style === "net") {
      rowClass = "border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
      labelClass = "text-sm font-bold text-gray-900 dark:text-white"
    } else if (style === "ending") {
      rowClass = "bg-brand-50/50 dark:bg-brand-900/10"
      labelClass = "text-sm font-bold text-brand-700 dark:text-brand-400"
    }

    let cols = `<td class="px-6 py-4 ${labelClass} whitespace-nowrap">${label}</td>
      <td class="px-6 py-4 text-sm font-semibold text-right tabular-nums ${amountClass(current)}">${fmt(current)}</td>`

    if (hasPrev) {
      const prev = d.prev[key]
      const v = d.variance?.[key]
      cols += `<td class="px-6 py-4 text-sm text-right tabular-nums ${amountClass(prev)}">${fmt(prev)}</td>
        <td class="px-6 py-4 text-sm font-medium text-right tabular-nums ${varianceClass(v?.dollar)}">${v ? fmt(v.dollar) : "—"}</td>
        <td class="px-6 py-4 text-sm font-medium text-right tabular-nums ${varianceClass(v?.dollar)}">${v ? fmtPct(v.percent) : "—"}</td>`
    }

    if (hasYtd) {
      const ytdVal = d.ytd[key]
      cols += `<td class="px-6 py-4 text-sm text-right tabular-nums ${amountClass(ytdVal)}">${fmt(ytdVal)}</td>`
    }

    return `<tr class="${rowClass}">${cols}</tr>`
  }

  _renderDetailSection(title, items, isOpen, key, color) {
    const chevron = isOpen
      ? `<svg class="h-5 w-5 transform rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`
      : `<svg class="h-5 w-5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`

    const total = items.reduce((sum, [, amt]) => sum + amt, 0).toFixed(2)
    const countLabel = `${items.length} item${items.length !== 1 ? "s" : ""}`

    let body = ""
    if (isOpen && items.length > 0) {
      const accessor = (item, f) => f === "name" ? item[0] : item[1]
      const sortedItems = sortData(items, this._sort.field, this._sort.dir, accessor)

      const rows = sortedItems.map(([name, amt]) =>
        `<tr class="border-b border-gray-100 dark:border-gray-700">
          <td class="px-6 py-2.5 text-sm text-gray-700 dark:text-gray-300">${escapeHtml(name)}</td>
          <td class="px-6 py-2.5 text-sm text-right tabular-nums font-medium ${amountClass(amt)}">${fmt(amt)}</td>
        </tr>`
      ).join("")

      body = `<div class="overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              ${sortTh("Name", "name", this._sort, "monthly-cash-flow", "left")}
              ${sortTh("Amount", "amount", this._sort, "monthly-cash-flow", "right")}
            </tr>
          </thead>
          <tbody>${rows}
            <tr class="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600">
              <td class="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
              <td class="px-6 py-3 text-sm font-bold text-right tabular-nums ${amountClass(total)}">${fmt(total)}</td>
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

  toggleSort(event) {
    const f = event.currentTarget.dataset.sortField
    if (!f) return
    this._sort = nextSortState(f, this._sort.field, this._sort.dir)
    this.render()
  }
}
