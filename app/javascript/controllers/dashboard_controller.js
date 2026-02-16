import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "monthLabel", "prevBtn", "nextBtn",
    "card1Content", "card1Flipper", "card1Front", "card1Back", "card1BackContent",
    "card2Flipper", "card2FrontContent", "card2BackContent",
    "card3Content",
    "card4Content", "card5Content",
    "cardsGrid", "card2Wrapper", "card2ExpandBtn"
  ]
  static values = { apiUrl: String, openMonthUrl: String, month: Number, year: Number }

  connect() {
    this.currentMonth = this.monthValue
    this.currentYear = this.yearValue
    this.isCard2Expanded = false
    this._updateArrowState()

    // ESC key to collapse Card 2
    this._escHandler = (e) => {
      if (e.key === "Escape" && this.isCard2Expanded) this.collapseCard2()
    }
    document.addEventListener("keydown", this._escHandler)

    // If the persisted month differs from current real month, fetch the correct data
    const now = new Date()
    if (this.currentMonth !== now.getMonth() + 1 || this.currentYear !== now.getFullYear()) {
      this._fetchAndRender()
    }
  }

  disconnect() {
    if (this._escHandler) document.removeEventListener("keydown", this._escHandler)
  }

  prevMonth() {
    this.currentMonth--
    if (this.currentMonth < 1) {
      this.currentMonth = 12
      this.currentYear--
    }
    this._persistMonth()
    this._fetchAndRender()
  }

  nextMonth() {
    const now = new Date()
    const currentRealMonth = now.getMonth() + 1
    const currentRealYear = now.getFullYear()
    // Don't go beyond current real month
    if (this.currentYear > currentRealYear ||
        (this.currentYear === currentRealYear && this.currentMonth >= currentRealMonth)) {
      return
    }
    this.currentMonth++
    if (this.currentMonth > 12) {
      this.currentMonth = 1
      this.currentYear++
    }
    this._persistMonth()
    this._fetchAndRender()
  }

  async _persistMonth() {
    if (!this.openMonthUrlValue) return
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    try {
      await fetch(this.openMonthUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ open_month_master: { current_year: this.currentYear, current_month: this.currentMonth } })
      })
    } catch (e) {
      // silently fail
    }
  }

  async _fetchAndRender() {
    const url = `${this.apiUrlValue}?month=${this.currentMonth}&year=${this.currentYear}`
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      const data = await res.json()

      // Update all month labels
      this.monthLabelTargets.forEach(el => el.textContent = data.month_label)
      this._updateArrowState()

      // Re-render cards
      this._renderCard1(data.spending_overview)
      this._renderCard2(data.accounts_overview)
      this._renderCard3(data.net_worth_overview)
      this._renderCard4(data.income_spending)
      this._renderCard5(data.recent_activity)
    } catch (e) {
      // silently fail
    }
  }

  _updateArrowState() {
    const now = new Date()
    const currentRealMonth = now.getMonth() + 1
    const currentRealYear = now.getFullYear()
    const atCurrentMonth = this.currentYear === currentRealYear && this.currentMonth === currentRealMonth

    this.nextBtnTargets.forEach(btn => {
      if (atCurrentMonth) {
        btn.classList.add("opacity-30", "cursor-not-allowed")
      } else {
        btn.classList.remove("opacity-30", "cursor-not-allowed")
      }
    })
  }

  // --- Card 1: Flip ---

  flipCard1() {
    if (this.hasCard1FlipperTarget) {
      this.card1FlipperTarget.style.transform = "rotateY(180deg)"
      if (this.hasCard1FrontTarget) this.card1FrontTarget.style.pointerEvents = "none"
      if (this.hasCard1BackTarget) this.card1BackTarget.style.pointerEvents = "auto"
    }
  }

  flipCard1Back() {
    if (this.hasCard1FlipperTarget) {
      this.card1FlipperTarget.style.transform = "rotateY(0deg)"
      if (this.hasCard1FrontTarget) this.card1FrontTarget.style.pointerEvents = ""
      if (this.hasCard1BackTarget) this.card1BackTarget.style.pointerEvents = "none"
    }
  }

  // --- Card 2: Flip ---

  flipCard2() {
    if (this.hasCard2FlipperTarget) {
      this.card2FlipperTarget.style.transform = "rotateY(180deg)"
    }
  }

  flipCard2Back() {
    if (this.hasCard2FlipperTarget) {
      this.card2FlipperTarget.style.transform = "rotateY(0deg)"
    }
  }

  // --- Card 2: Expand/Collapse ---

  toggleCard2Expand() {
    if (this.isCard2Expanded) {
      this.collapseCard2()
    } else {
      this.expandCard2()
    }
  }

  expandCard2() {
    if (!this.hasCardsGridTarget || !this.hasCard2WrapperTarget) return
    const grid = this.cardsGridTarget
    const card2 = this.card2WrapperTarget

    // Save current grid height
    this._savedGridHeight = grid.offsetHeight

    // Hide other cards
    Array.from(grid.children).forEach(child => {
      if (child !== card2) child.classList.add("hidden")
    })

    // Make Card 2 fill the grid
    grid.style.minHeight = `${this._savedGridHeight}px`
    card2.style.gridColumn = "1 / -1"
    card2.style.minHeight = `${this._savedGridHeight}px`

    // Swap icons to collapse
    this._updateExpandIcons(true)
    this.isCard2Expanded = true
  }

  collapseCard2() {
    if (!this.hasCardsGridTarget || !this.hasCard2WrapperTarget) return
    const grid = this.cardsGridTarget
    const card2 = this.card2WrapperTarget

    // Show other cards
    Array.from(grid.children).forEach(child => {
      child.classList.remove("hidden")
    })

    // Restore Card 2 to normal
    grid.style.minHeight = ""
    card2.style.gridColumn = ""
    card2.style.minHeight = ""

    // Swap icons to expand
    this._updateExpandIcons(false)
    this.isCard2Expanded = false
  }

  _updateExpandIcons(expanded) {
    this.card2ExpandBtnTargets.forEach(btn => {
      const expandIcon = btn.querySelector('[data-icon="expand"]')
      const collapseIcon = btn.querySelector('[data-icon="collapse"]')
      if (expandIcon) expandIcon.classList.toggle("hidden", expanded)
      if (collapseIcon) collapseIcon.classList.toggle("hidden", !expanded)
    })
  }

  // --- Card 1: Spending Overview ---

  _renderCard1(data) {
    const spent = this._currency(data.spent)
    // Front side content
    this.card1ContentTarget.innerHTML = `
      <div class="flex items-center space-x-4 flex-1">
        <div class="relative w-32 h-32 flex-shrink-0">
          <svg viewBox="0 0 36 36" class="w-full h-full">
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" stroke-width="3" class="dark:opacity-30"/>
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#a855f7" stroke-width="3"
                    stroke-dasharray="100 0" stroke-dashoffset="25" stroke-linecap="round"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xs text-gray-500 dark:text-gray-400">Spent</span>
            <span class="text-sm font-bold text-gray-900 dark:text-white">${spent}</span>
          </div>
        </div>
        <div>
          <p class="text-lg font-semibold text-gray-800 dark:text-gray-200">${spent}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">spent this month</p>
        </div>
      </div>`

    // Back side content (category breakdown)
    if (this.hasCard1BackContentTarget) {
      const categories = data.categories || []
      if (categories.length === 0) {
        this.card1BackContentTarget.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500">No spending yet for this month.</p>`
      } else {
        const colorMap = { blue: "#3b82f6", green: "#22c55e", gold: "#eab308", red: "#ef4444", purple: "#a855f7", pink: "#ec4899", indigo: "#6366f1", teal: "#14b8a6", orange: "#f97316", gray: "#6b7280" }
        let html = '<div class="space-y-2">'
        for (const cat of categories) {
          const dotColor = colorMap[cat.color_key] || "#6b7280"
          html += `
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2 min-w-0">
                <span class="w-2 h-2 rounded-full flex-shrink-0" style="background: ${dotColor}"></span>
                <span class="text-sm text-gray-700 dark:text-gray-300 truncate">${this._esc(cat.name)}</span>
              </div>
              <div class="flex items-center space-x-3 flex-shrink-0 ml-2">
                <span class="text-sm font-semibold text-gray-900 dark:text-white">${this._currency(cat.amount)}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">${cat.pct}%</span>
              </div>
            </div>`
        }
        html += '</div>'
        this.card1BackContentTarget.innerHTML = html
      }
    }
  }

  // --- Card 2: Accounts ---

  _renderCard2(data) {
    if (!data) return
    const colors = ["blue", "green", "purple", "amber", "sky", "red"]
    const pieColorsHex = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#0ea5e9", "#ef4444"]
    const accounts = data.accounts || []
    const total = data.total || 0

    // Front: header + account list
    if (this.hasCard2FrontContentTarget) {
      let html = `
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Accounts</h2>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Total: ${this._currency(total)}</span>
        </div>
        <ul class="space-y-3 flex-1">`
      if (accounts.length === 0) {
        html += `<li class="text-sm text-gray-400 dark:text-gray-500">No accounts yet.</li>`
      } else {
        accounts.forEach((a, i) => {
          const c = colors[i % colors.length]
          html += `
            <li class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-7 h-7 rounded-lg bg-${c}-100 dark:bg-${c}-900/30 flex items-center justify-center">
                  <svg class="w-4 h-4 text-${c}-600 dark:text-${c}-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                </span>
                <span class="text-sm text-gray-700 dark:text-gray-300">${this._esc(a.name)}</span>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">${this._currency(a.balance)}</span>
            </li>`
        })
      }
      html += `</ul>`
      this.card2FrontContentTarget.innerHTML = html
    }

    // Back: header + pie chart + legend
    if (this.hasCard2BackContentTarget) {
      const sorted = [...accounts].sort((a, b) => b.balance - a.balance)
      let html = `
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Accounts</h2>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Total: ${this._currency(total)}</span>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center overflow-hidden">`

      if (total > 0 && sorted.length > 0) {
        // Build pie chart SVG
        const cx = 50, cy = 50, r = 45
        let angle = -90.0
        let paths = ""
        sorted.forEach((a, i) => {
          const pct = a.balance / total * 100
          if (pct <= 0) return
          const color = pieColorsHex[i % pieColorsHex.length]
          const sweep = (pct / 100.0) * 360.0
          const endA = angle + sweep
          if (sweep >= 359.99) {
            paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
          } else {
            const sr = angle * Math.PI / 180
            const er = endA * Math.PI / 180
            const x1 = (cx + r * Math.cos(sr)).toFixed(2)
            const y1 = (cy + r * Math.sin(sr)).toFixed(2)
            const x2 = (cx + r * Math.cos(er)).toFixed(2)
            const y2 = (cy + r * Math.sin(er)).toFixed(2)
            const large = sweep > 180 ? 1 : 0
            paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}"/>`
          }
          angle = endA
        })
        html += `<svg viewBox="0 0 100 100" class="w-28 h-28 flex-shrink-0">${paths}</svg>`

        // Legend
        html += `<div class="mt-2 w-full space-y-1 overflow-y-auto" style="max-height: 5.5rem;">`
        sorted.forEach((a, i) => {
          const color = pieColorsHex[i % pieColorsHex.length]
          const pct = total > 0 ? Math.round(a.balance / total * 100) : 0
          html += `
            <div class="flex items-center text-xs px-1">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color}"></span>
              <span class="text-gray-700 dark:text-gray-300 truncate ml-1.5">${this._esc(a.name)} &mdash; ${this._currency(a.balance)} &mdash; ${pct}%</span>
            </div>`
        })
        html += `</div>`
      } else {
        html += `<p class="text-sm text-gray-400 dark:text-gray-500">No accounts to chart.</p>`
      }
      html += `</div>`
      this.card2BackContentTarget.innerHTML = html
    }
  }

  // --- Card 3: Net Worth ---

  _renderCard3(data) {
    if (!data || !this.hasCard3ContentTarget) return
    const value = data.value || 0
    const change = data.change || 0
    const changePct = data.change_pct || 0
    const snapshots = data.snapshots || []

    let html = ""

    // Value + change badge
    html += `<div class="flex items-baseline space-x-2 mb-3">`
    html += `<span class="text-2xl font-bold text-gray-900 dark:text-white">${this._currency(value)}</span>`
    if (change >= 0) {
      html += `<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">+${this._currency(change)} (${changePct}%)</span>`
    } else {
      html += `<span class="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">${this._currency(change)} (${changePct}%)</span>`
    }
    html += `</div>`

    // Chart
    if (snapshots.length === 0) {
      html += `<div class="w-full h-20 flex-1 flex items-center justify-center"><p class="text-xs text-gray-400 dark:text-gray-500">No history yet</p></div>`
    } else if (snapshots.length === 1) {
      html += `<div class="w-full h-20 flex-1"><svg viewBox="0 0 200 60" class="w-full h-full" preserveAspectRatio="xMidYMid meet"><circle cx="100" cy="30" r="5" fill="#a855f7"/></svg></div>`
      html += `<div class="flex justify-center text-[10px] text-gray-400 dark:text-gray-500 mt-1"><span>${this._esc(snapshots[0].label)}</span></div>`
    } else {
      const amounts = snapshots.map(s => s.amount)
      const minVal = Math.min(...amounts)
      const maxVal = Math.max(...amounts)
      let range = maxVal - minVal
      if (range === 0) range = 1
      const padding = 5, chartH = 50, chartW = 190
      const points = snapshots.map((s, i) => {
        const x = padding + (i / (snapshots.length - 1)) * chartW
        const y = padding + chartH - ((s.amount - minVal) / range * chartH)
        return [x.toFixed(1), y.toFixed(1)]
      })
      const polylineStr = points.map(p => p.join(",")).join(" ")
      const areaPath = `M${points[0][0]},${points[0][1]} ` +
        points.slice(1).map(p => `L${p[0]},${p[1]}`).join(" ") +
        ` L${points[points.length-1][0]},${padding + chartH} L${points[0][0]},${padding + chartH} Z`

      html += `<div class="w-full h-20 flex-1"><svg viewBox="0 0 200 60" class="w-full h-full" preserveAspectRatio="none">`
      html += `<defs><linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a855f7" stop-opacity="0.3"/><stop offset="100%" stop-color="#a855f7" stop-opacity="0"/></linearGradient></defs>`
      html += `<path d="${areaPath}" fill="url(#netWorthGrad)"/>`
      html += `<polyline points="${polylineStr}" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      points.forEach(p => {
        html += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#a855f7"/>`
      })
      html += `</svg></div>`
      html += `<div class="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">`
      snapshots.forEach(s => { html += `<span>${this._esc(s.label)}</span>` })
      html += `</div>`
    }

    html += `<p class="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">Your net worth chart will build automatically as more months are added.</p>`

    this.card3ContentTarget.innerHTML = html
  }

  // --- Card 4: Income & Spending ---

  _renderCard4(data) {
    let accountsHtml = ""
    for (const acct of data.new_accounts) {
      accountsHtml += `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </span>
            <div class="flex flex-col">
              <span class="text-sm text-gray-700 dark:text-gray-300">New Account Added</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">(${this._esc(acct.name)})</span>
            </div>
          </div>
          <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+${this._currency(acct.beginning_balance)}</span>
        </div>`
    }

    this.card4ContentTarget.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span class="text-emerald-600 dark:text-emerald-400 text-xs font-bold">$</span>
          </span>
          <span class="text-sm text-gray-700 dark:text-gray-300">Beginning Balance</span>
        </div>
        <span class="text-sm font-semibold text-gray-900 dark:text-white">${this._currency(data.beginning_balance)}</span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
          </span>
          <span class="text-sm text-gray-700 dark:text-gray-300">Income</span>
        </div>
        <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+${this._currency(data.income)}</span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
          </span>
          <span class="text-sm text-gray-700 dark:text-gray-300">Expenses</span>
        </div>
        <span class="text-sm font-semibold text-red-600 dark:text-red-400">${this._currency(data.expenses)}</span>
      </div>
      ${accountsHtml}
      <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span class="text-emerald-600 dark:text-emerald-400 text-xs font-bold">$</span>
          </span>
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">Current Balance</span>
        </div>
        <span class="text-sm font-bold text-gray-900 dark:text-white">${this._currency(data.current_balance)}</span>
      </div>`
  }

  // --- Card 5: Recent Activity ---

  _renderCard5(payments) {
    const colors = ["blue", "green", "purple", "amber", "sky"]
    if (payments.length === 0) {
      this.card5ContentTarget.innerHTML = `<li class="text-sm text-gray-400 dark:text-gray-500">No payments this month.</li>`
      return
    }
    let html = ""
    payments.forEach((p, i) => {
      const c = colors[i % colors.length]
      html += `
        <li class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-7 h-7 rounded-lg bg-${c}-100 dark:bg-${c}-900/30 flex items-center justify-center">
              <svg class="w-4 h-4 text-${c}-500 dark:text-${c}-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a5 5 0 00-10 0v2M12 12v3m-3-3h6m-9 7h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2z"/>
              </svg>
            </span>
            <span class="text-sm text-gray-700 dark:text-gray-300"><span class="text-gray-400 dark:text-gray-500">${this._esc(p.date)}</span> ${this._esc(p.description)}</span>
          </div>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">${this._currency(p.amount)}</span>
        </li>`
    })
    this.card5ContentTarget.innerHTML = html
  }

  // --- Helpers ---

  _currency(val) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0)
  }

  _esc(str) {
    if (!str) return ""
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
