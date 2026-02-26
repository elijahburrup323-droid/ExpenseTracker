import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tabBtn", "tabPanel",
    "headerSymbol", "headerName",
    "metricShares", "metricMV", "metricCB", "metricUG",
    "txnTableBody", "divTableBody", "perfChart",
    "notesArea", "notesSaveBtn", "notesStatus"
  ]

  static values = {
    holdingId: Number,
    apiUrl: String,
    accountUrl: String,
    csrfToken: String
  }

  connect() {
    this.holding = null
    this.activeTab = "transactions"
    this.fetchData()
  }

  async fetchData() {
    try {
      const res = await fetch(`${this.apiUrlValue}/${this.holdingIdValue}`, { credentials: "same-origin" })
      if (!res.ok) { window.location.href = this.accountUrlValue; return }
      this.holding = await res.json()
      this.renderMetrics()
      this.renderTransactions()
    } catch (e) {
      console.error("Failed to load holding", e)
    }
  }

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab
    if (tab === this.activeTab) return
    this.activeTab = tab

    this.tabBtnTargets.forEach(btn => {
      const isActive = btn.dataset.tab === tab
      btn.classList.toggle("border-brand-600", isActive)
      btn.classList.toggle("text-brand-600", isActive)
      btn.classList.toggle("dark:border-brand-400", isActive)
      btn.classList.toggle("dark:text-brand-400", isActive)
      btn.classList.toggle("border-transparent", !isActive)
      btn.classList.toggle("text-gray-500", !isActive)
      btn.classList.toggle("dark:text-gray-400", !isActive)
    })

    this.tabPanelTargets.forEach(panel => {
      panel.classList.toggle("hidden", panel.dataset.tab !== tab)
    })

    if (tab === "dividends") this.renderDividends()
    if (tab === "performance") this.renderPerformance()
  }

  renderMetrics() {
    const h = this.holding
    if (!h) return

    const mv = parseFloat(h.market_value || 0)
    const cb = parseFloat(h.cost_basis || 0)
    const ug = parseFloat(h.unrealized_gain || 0)

    this.metricSharesTarget.textContent = parseFloat(h.shares_held || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
    this.metricMVTarget.textContent = this._fmt(mv)
    this.metricCBTarget.textContent = this._fmt(cb)

    const ugEl = this.metricUGTarget
    ugEl.textContent = (ug >= 0 ? "+" : "") + this._fmt(ug)
    ugEl.className = ugEl.className.replace(/text-(green|red)-\d+/g, "").replace(/dark:text-(green|red)-\d+/g, "").trim()
    if (ug >= 0) {
      ugEl.classList.add("text-green-600", "dark:text-green-400")
    } else {
      ugEl.classList.add("text-red-600", "dark:text-red-400")
    }
  }

  renderTransactions() {
    const txns = this.holding?.transactions || []
    if (txns.length === 0) {
      this.txnTableBodyTarget.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No transactions recorded.</td></tr>`
      return
    }
    const sorted = [...txns].sort((a, b) => (b.transaction_date || "").localeCompare(a.transaction_date || ""))
    this.txnTableBodyTarget.innerHTML = sorted.map(t => this._renderTxnRow(t)).join("")
  }

  _renderTxnRow(t) {
    const typeBadge = this._typeBadge(t.transaction_type)
    const qty = t.shares != null
      ? parseFloat(t.shares).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
      : "\u2014"
    const price = t.price_per_share != null ? this._fmt(t.price_per_share) : "\u2014"
    const amount = this._fmt(t.total_amount)
    const isSell = t.transaction_type === "SELL"
    const rg = isSell && t.realized_gain != null
      ? ((t.realized_gain >= 0 ? "+" : "") + this._fmt(t.realized_gain))
      : "\u2014"
    const rgColor = isSell && t.realized_gain != null
      ? (t.realized_gain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
      : "text-gray-400 dark:text-gray-500"

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(t.transaction_date || "")}</td>
      <td class="px-6 py-3 text-sm">${typeBadge}</td>
      <td class="px-6 py-3 text-sm text-right tabular-nums text-gray-900 dark:text-white">${qty}</td>
      <td class="px-6 py-3 text-sm text-right tabular-nums text-gray-900 dark:text-white">${price}</td>
      <td class="px-6 py-3 text-sm text-right tabular-nums text-gray-900 dark:text-white font-medium">${amount}</td>
      <td class="px-6 py-3 text-sm text-right tabular-nums ${rgColor} font-medium">${rg}</td>
      <td class="px-6 py-3 text-right text-sm text-gray-400 dark:text-gray-500">View</td>
    </tr>`
  }

  _typeBadge(type) {
    const colors = {
      BUY: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      SELL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      DIVIDEND: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      REINVEST: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      FEE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      SPLIT: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
    }
    const cls = colors[type] || colors.SPLIT
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}">${escapeHtml(type || "")}</span>`
  }

  renderDividends() {
    const txns = (this.holding?.transactions || []).filter(t =>
      t.transaction_type === "DIVIDEND" || t.transaction_type === "REINVEST"
    )
    if (txns.length === 0) {
      this.divTableBodyTarget.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No dividend transactions recorded.</td></tr>`
      return
    }
    const sorted = [...txns].sort((a, b) => (b.transaction_date || "").localeCompare(a.transaction_date || ""))
    this.divTableBodyTarget.innerHTML = sorted.map(t => {
      const reinvested = t.transaction_type === "REINVEST"
      const reinvestCls = reinvested
        ? "text-green-600 dark:text-green-400 font-medium"
        : "text-gray-500 dark:text-gray-400"
      return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(t.transaction_date || "")}</td>
        <td class="px-6 py-3 text-sm text-right tabular-nums text-gray-900 dark:text-white font-medium">${this._fmt(t.total_amount)}</td>
        <td class="px-6 py-3 text-sm text-center ${reinvestCls}">${reinvested ? "Yes" : "No"}</td>
      </tr>`
    }).join("")
  }

  renderPerformance() {
    this.perfChartTarget.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
        <h3 class="mt-3 text-sm font-medium text-gray-900 dark:text-white">Performance</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Performance history not yet available.</p>
      </div>`
  }

  // ===== Notes =====

  notesChanged() {
    this.notesSaveBtnTarget.disabled = false
    this.notesSaveBtnTarget.classList.remove("opacity-50")
    this.notesStatusTarget.textContent = ""
  }

  async saveNotes() {
    const notes = this.notesAreaTarget.value.trim() || null
    this.notesSaveBtnTarget.disabled = true
    this.notesSaveBtnTarget.classList.add("opacity-50")
    this.notesStatusTarget.textContent = "Saving..."

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.holdingIdValue}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ investment_holding: { notes } })
      })
      if (res.ok) {
        this.holding = await res.json()
        this.notesStatusTarget.textContent = "Saved"
        setTimeout(() => { this.notesStatusTarget.textContent = "" }, 2000)
      } else {
        this.notesStatusTarget.textContent = "Save failed"
        this.notesSaveBtnTarget.disabled = false
        this.notesSaveBtnTarget.classList.remove("opacity-50")
      }
    } catch (e) {
      this.notesStatusTarget.textContent = "Network error"
      this.notesSaveBtnTarget.disabled = false
      this.notesSaveBtnTarget.classList.remove("opacity-50")
    }
  }

  _fmt(val) {
    return parseFloat(val || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })
  }
}
