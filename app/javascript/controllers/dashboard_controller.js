import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static targets = [
    "monthLabel", "prevBtn", "nextBtn",
    "cardsGrid", "slotWrapper"
  ]
  static values = { apiUrl: String, reorderUrl: String, openMonthUrl: String, month: Number, year: Number }

  connect() {
    this.currentMonth = this.monthValue
    this.currentYear = this.yearValue
    this.expandedCardType = null
    this._updateArrowState()
    this._initSortable()

    // ESC key to collapse expanded card
    this._escHandler = (e) => {
      if (e.key === "Escape" && this.expandedCardType) this._collapseCard()
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
    if (this.sortable) this.sortable.destroy()
  }

  // --- Month Navigation ---

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
    } catch (e) { /* silently fail */ }
  }

  // --- Fetch & Render ---

  async _fetchAndRender() {
    const url = `${this.apiUrlValue}?month=${this.currentMonth}&year=${this.currentYear}`
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      const data = await res.json()

      // Update all month labels
      this.monthLabelTargets.forEach(el => el.textContent = data.month_label)
      this._updateArrowState()

      // Slot-based rendering
      for (const slotData of (data.slots || [])) {
        const wrapper = this._findSlotWrapper(slotData.slot_number)
        if (!wrapper) continue
        const renderer = this._renderers[slotData.card_type]
        if (renderer) renderer.call(this, wrapper, slotData.data)
      }
    } catch (e) { /* silently fail */ }
  }

  _findSlotWrapper(slotNumber) {
    return this.slotWrapperTargets.find(
      el => parseInt(el.dataset.slotNumber) === slotNumber
    )
  }

  get _renderers() {
    return {
      spending_overview: this._renderSpendingOverview,
      accounts_overview: this._renderAccountsOverview,
      net_worth: this._renderNetWorth,
      income_spending: this._renderIncomeSpending,
      recent_activity: this._renderRecentActivity,
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

  // --- Generic Flip ---

  flipCard(event) {
    const wrapper = event.target.closest("[data-dashboard-target='slotWrapper']")
    if (!wrapper) return
    const flipper = wrapper.querySelector("[data-role='flipper']")
    if (!flipper) return
    flipper.style.transform = "rotateY(180deg)"
    const front = wrapper.querySelector("[data-role='front']")
    const back = wrapper.querySelector("[data-role='back']")
    if (front) front.style.pointerEvents = "none"
    if (back) back.style.pointerEvents = "auto"
  }

  flipCardBack(event) {
    const wrapper = event.target.closest("[data-dashboard-target='slotWrapper']")
    if (!wrapper) return
    const flipper = wrapper.querySelector("[data-role='flipper']")
    if (!flipper) return
    flipper.style.transform = "rotateY(0deg)"
    const front = wrapper.querySelector("[data-role='front']")
    const back = wrapper.querySelector("[data-role='back']")
    if (front) front.style.pointerEvents = ""
    if (back) back.style.pointerEvents = "none"
  }

  // --- Generic Expand/Collapse ---

  toggleCardExpand(event) {
    const wrapper = event.target.closest("[data-dashboard-target='slotWrapper']")
    if (!wrapper) return
    const cardType = wrapper.dataset.cardType
    if (this.expandedCardType === cardType) {
      this._collapseCard()
    } else {
      this._expandCard(wrapper)
    }
  }

  _expandCard(wrapper) {
    if (!this.hasCardsGridTarget) return
    const grid = this.cardsGridTarget
    this._savedGridHeight = grid.offsetHeight
    this._expandedWrapper = wrapper

    Array.from(grid.children).forEach(child => {
      if (child !== wrapper) child.classList.add("hidden")
    })

    grid.style.minHeight = `${this._savedGridHeight}px`
    wrapper.style.gridColumn = "1 / -1"
    wrapper.style.minHeight = `${this._savedGridHeight}px`

    this._updateExpandIcons(wrapper, true)
    this.expandedCardType = wrapper.dataset.cardType
    if (this.sortable) this.sortable.option("disabled", true)
  }

  _collapseCard() {
    if (!this.hasCardsGridTarget || !this._expandedWrapper) return
    const grid = this.cardsGridTarget
    const wrapper = this._expandedWrapper

    Array.from(grid.children).forEach(child => {
      child.classList.remove("hidden")
    })

    grid.style.minHeight = ""
    wrapper.style.gridColumn = ""
    wrapper.style.minHeight = ""

    this._updateExpandIcons(wrapper, false)
    this.expandedCardType = null
    this._expandedWrapper = null
    if (this.sortable) this.sortable.option("disabled", false)
  }

  _updateExpandIcons(wrapper, expanded) {
    wrapper.querySelectorAll("[data-role='expand-btn']").forEach(btn => {
      const expandIcon = btn.querySelector('[data-icon="expand"]')
      const collapseIcon = btn.querySelector('[data-icon="collapse"]')
      if (expandIcon) expandIcon.classList.toggle("hidden", expanded)
      if (collapseIcon) collapseIcon.classList.toggle("hidden", !expanded)
    })
  }

  // --- SortableJS Drag-and-Drop ---

  _initSortable() {
    if (!this.hasCardsGridTarget) return
    this.sortable = Sortable.create(this.cardsGridTarget, {
      animation: 150,
      swap: true,
      swapClass: "dashboard-swap-highlight",
      ghostClass: "opacity-30",
      filter: "a, button, select, input, textarea, label, .no-drag",
      preventOnFilter: false,
      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onEnd: (evt) => {
        this._cleanupDragArtifacts()
        this._onSortEnd()
      },
    })
  }

  _cleanupDragArtifacts() {
    if (!this.hasCardsGridTarget) return
    this.cardsGridTarget.querySelectorAll("[data-dashboard-target='slotWrapper']").forEach(el => {
      el.classList.remove("dashboard-swap-highlight", "opacity-30", "sortable-drag", "sortable-ghost")
      el.style.removeProperty("z-index")
      el.style.removeProperty("position")
      el.style.removeProperty("transform")
      el.style.removeProperty("opacity")
    })
  }

  async _onSortEnd() {
    const wrappers = Array.from(this.cardsGridTarget.children)
    const assignments = wrappers.map((el, idx) => ({
      slot_number: idx + 1,
      card_key: el.dataset.cardKey,
    }))

    // Update data-slot-number attributes to match new positions
    wrappers.forEach((el, idx) => {
      el.dataset.slotNumber = idx + 1
    })

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    try {
      await fetch(this.reorderUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ slots: assignments }),
      })
    } catch (e) {
      window.location.reload()
    }
  }

  // --- Card Renderers ---

  _renderSpendingOverview(wrapper, data) {
    const spent = this._currency(data.spent)
    const content = wrapper.querySelector("[data-role='card-content']")
    if (content) {
      content.innerHTML = `
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
    }

    const backContent = wrapper.querySelector("[data-role='card-back-content']")
    if (backContent) {
      const categories = data.categories || []
      const types = data.types || []
      const colorMap = { blue: "#3b82f6", green: "#22c55e", gold: "#eab308", red: "#ef4444", purple: "#a855f7", pink: "#ec4899", indigo: "#6366f1", teal: "#14b8a6", orange: "#f97316", gray: "#6b7280" }

      const renderList = (items, listType) => {
        if (items.length === 0) return `<p class="text-xs text-gray-400 dark:text-gray-500">No spending yet.</p>`
        let h = '<div class="space-y-1.5">'
        for (const item of items) {
          const dotColor = colorMap[item.color_key] || "#6b7280"
          let limitHtml = ""
          if (listType === "category" && item.limit != null) {
            const pctUsed = item.limit_pct_used || 0
            const barColor = pctUsed >= 100 ? "#ef4444" : pctUsed >= 80 ? "#f59e0b" : "#22c55e"
            const barWidth = Math.min(pctUsed, 100)
            limitHtml = `
              <div class="flex items-center mt-0.5">
                <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mr-2">
                  <div class="h-1.5 rounded-full" style="width: ${barWidth}%; background: ${barColor}"></div>
                </div>
                <span class="text-[10px] ${pctUsed >= 100 ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'}">${this._currency(item.amount)} / ${this._currency(item.limit)}</span>
              </div>`
          } else if (listType === "type" && item.limit_pct != null) {
            const over = item.over_under || 0
            const overClass = over > 0 ? "text-red-500" : "text-green-500"
            const sign = over > 0 ? "+" : ""
            limitHtml = `<span class="text-[10px] ${overClass} ml-1">(lim ${item.limit_pct}%, ${sign}${over}%)</span>`
          }
          h += `
            <div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2 min-w-0">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" style="background: ${dotColor}"></span>
                  <span class="text-xs text-gray-700 dark:text-gray-300 truncate">${this._esc(item.name)}</span>
                </div>
                <div class="flex items-center space-x-2 flex-shrink-0 ml-2">
                  <span class="text-xs font-semibold text-gray-900 dark:text-white">${this._currency(item.amount)}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">${item.pct}%</span>
                  ${listType === "type" && item.limit_pct != null ? limitHtml : ""}
                </div>
              </div>
              ${listType === "category" && item.limit != null ? limitHtml : ""}
            </div>`
        }
        h += '</div>'
        h += `<p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1.5">Total: ${spent}</p>`
        return h
      }

      let html = `<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">By Category</p>`
      html += renderList(categories, "category")
      html += `<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-3 mb-1.5">By Spending Type</p>`
      html += renderList(types, "type")
      backContent.innerHTML = html
    }
  }

  _renderAccountsOverview(wrapper, data) {
    if (!data) return
    const colors = ["blue", "green", "purple", "amber", "sky", "red"]
    const pieColorsHex = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#0ea5e9", "#ef4444"]
    const accounts = data.accounts || []
    const total = data.total || 0

    const frontContent = wrapper.querySelector("[data-role='front-content']")
    if (frontContent) {
      let html = `
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Accounts</h2>
          </div>
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
      frontContent.innerHTML = html
    }

    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      const sorted = [...accounts].sort((a, b) => b.balance - a.balance)
      let html = `
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Accounts</h2>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">Total: ${this._currency(total)}</span>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center overflow-hidden">`

      if (total > 0 && sorted.length > 0) {
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
      backContent.innerHTML = html
    }
  }

  _renderNetWorth(wrapper, data) {
    if (!data) return
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    const value = data.value || 0
    const change = data.change || 0
    const changePct = data.change_pct || 0
    const snapshots = data.snapshots || []

    let html = ""
    html += `<div class="flex items-baseline space-x-2 mb-3">`
    html += `<span class="text-2xl font-bold text-gray-900 dark:text-white">${this._currency(value)}</span>`
    if (change >= 0) {
      html += `<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">+${this._currency(change)} (${changePct}%)</span>`
    } else {
      html += `<span class="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">${this._currency(change)} (${changePct}%)</span>`
    }
    html += `</div>`

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
    content.innerHTML = html
  }

  _renderIncomeSpending(wrapper, data) {
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    let accountsHtml = ""
    for (const acct of (data.new_accounts || [])) {
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

    content.innerHTML = `
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

  _renderRecentActivity(wrapper, data) {
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return
    const payments = data.recent || []
    const colors = ["blue", "green", "purple", "amber", "sky"]

    if (payments.length === 0) {
      content.innerHTML = `<li class="text-sm text-gray-400 dark:text-gray-500">No payments this month.</li>`
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
    content.innerHTML = html
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
