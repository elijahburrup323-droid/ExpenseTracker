import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static targets = [
    "monthLabel", "prevBtn", "nextBtn",
    "cardsGrid", "slotWrapper",
    "tagFilterWrapper", "tagFilterBtn", "tagFilterLabel", "tagFilterDropdown", "tagCheckboxList",
    "pulseStrip"
  ]
  static values = { apiUrl: String, recentActivityUrl: String, reorderUrl: String, openMonthUrl: String, tagsUrl: String, month: Number, year: Number, earliestMonth: Number, earliestYear: Number }

  connect() {
    this.currentMonth = this.monthValue
    this.currentYear = this.yearValue
    this.earliestMonth = this.earliestMonthValue || 1
    this.earliestYear = this.earliestYearValue || 2020
    this.expandedCardType = null
    this._selectedTagIds = []
    this._allTags = []
    this._updateArrowState()
    this._initSortable()
    this._loadTags()

    // --- State persistence: check reset flag vs restore ---
    const shouldReset = sessionStorage.getItem('bhDashReset') === '1'
    if (shouldReset) {
      sessionStorage.removeItem('bhDashReset')
      sessionStorage.removeItem(this._storageKey)
    }

    if (!shouldReset) {
      const restored = this._restoreState()
      if (!restored) {
        const now = new Date()
        if (this.currentMonth !== now.getMonth() + 1 || this.currentYear !== now.getFullYear()) {
          this._fetchAndRender()
        }
      }
    } else {
      const now = new Date()
      if (this.currentMonth !== now.getMonth() + 1 || this.currentYear !== now.getFullYear()) {
        this._fetchAndRender()
      }
    }

    // ESC key to collapse expanded card
    this._escHandler = (e) => {
      if (e.key === "Escape" && this.expandedCardType) this._collapseCard()
    }
    document.addEventListener("keydown", this._escHandler)

    // Close tag dropdown on outside click
    this._outsideClickHandler = (e) => {
      if (this.hasTagFilterDropdownTarget &&
          !this.tagFilterDropdownTarget.classList.contains("hidden") &&
          this.hasTagFilterWrapperTarget &&
          !this.tagFilterWrapperTarget.contains(e.target)) {
        this.tagFilterDropdownTarget.classList.add("hidden")
      }
    }
    document.addEventListener("click", this._outsideClickHandler)

    // Save state BEFORE Turbo navigates away (DOM still intact at this point)
    this._turboBeforeCacheHandler = () => { this._saveState() }
    document.addEventListener("turbo:before-cache", this._turboBeforeCacheHandler)

    // Fallback for non-Turbo navigations (full page reload, manual URL entry)
    this._beforeUnloadHandler = () => { this._saveState() }
    window.addEventListener("beforeunload", this._beforeUnloadHandler)
  }

  disconnect() {
    this._saveState()
    if (this._escHandler) document.removeEventListener("keydown", this._escHandler)
    if (this._outsideClickHandler) document.removeEventListener("click", this._outsideClickHandler)
    if (this._turboBeforeCacheHandler) document.removeEventListener("turbo:before-cache", this._turboBeforeCacheHandler)
    if (this._beforeUnloadHandler) window.removeEventListener("beforeunload", this._beforeUnloadHandler)
    if (this.sortable) this.sortable.destroy()
  }

  // --- Month Navigation ---

  prevMonth() {
    // CM-25: Don't navigate before earliest allowed month
    if (this.currentYear === this.earliestYear && this.currentMonth <= this.earliestMonth) return
    if (this.currentYear < this.earliestYear) return
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

  // --- Tag Filter ---

  async _loadTags() {
    if (!this.tagsUrlValue) return
    try {
      const res = await fetch(this.tagsUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) this._allTags = await res.json()
    } catch (e) { /* silently fail */ }
    this._renderTagCheckboxes()
  }

  _renderTagCheckboxes() {
    if (!this.hasTagCheckboxListTarget) return
    if (this._allTags.length === 0) {
      this.tagCheckboxListTarget.innerHTML = `<p class="text-sm text-gray-400 italic">No tags yet</p>`
      return
    }
    const TAG_COLORS = {
      blue: "bg-blue-500", green: "bg-green-500", gold: "bg-yellow-500", red: "bg-red-500",
      purple: "bg-purple-500", pink: "bg-pink-500", indigo: "bg-indigo-500", teal: "bg-teal-500",
      orange: "bg-orange-500", gray: "bg-gray-400"
    }
    this.tagCheckboxListTarget.innerHTML = this._allTags.map(t => {
      const checked = this._selectedTagIds.includes(t.id) ? "checked" : ""
      const dotCls = TAG_COLORS[t.color_key] || TAG_COLORS.gray
      return `<label class="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
        <input type="checkbox" value="${t.id}" ${checked}
               class="h-3.5 w-3.5 rounded text-brand-600 focus:ring-brand-500 border-gray-300 dark:border-gray-600"
               data-action="change->dashboard#onTagCheckboxChange">
        <span class="inline-block w-2.5 h-2.5 rounded-full ${dotCls} flex-shrink-0"></span>
        <span class="text-sm text-gray-700 dark:text-gray-300 truncate">${this._escHtml(t.name)}</span>
      </label>`
    }).join("")
  }

  _escHtml(str) {
    if (!str) return ""
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  toggleTagFilter(event) {
    event.stopPropagation()
    if (!this.hasTagFilterDropdownTarget) return
    this.tagFilterDropdownTarget.classList.toggle("hidden")
  }

  onTagCheckboxChange(event) {
    const id = Number(event.target.value)
    if (event.target.checked) {
      if (!this._selectedTagIds.includes(id)) this._selectedTagIds.push(id)
    } else {
      this._selectedTagIds = this._selectedTagIds.filter(x => x !== id)
    }
    this._updateTagFilterLabel()
    this._fetchAndRender()
  }

  clearTagFilter() {
    this._selectedTagIds = []
    this._renderTagCheckboxes()
    this._updateTagFilterLabel()
    this._fetchAndRender()
  }

  _updateTagFilterLabel() {
    if (!this.hasTagFilterLabelTarget) return
    const count = this._selectedTagIds.length
    if (count === 0) {
      this.tagFilterLabelTarget.textContent = "Filter by Tag"
      this.tagFilterBtnTarget.classList.remove("ring-2", "ring-brand-500", "border-brand-500")
    } else {
      this.tagFilterLabelTarget.textContent = `${count} Tag${count > 1 ? "s" : ""} Active`
      this.tagFilterBtnTarget.classList.add("ring-2", "ring-brand-500", "border-brand-500")
    }
  }

  // --- Fetch & Render ---

  async _fetchAndRender() {
    let url = `${this.apiUrlValue}?month=${this.currentMonth}&year=${this.currentYear}`
    if (this._selectedTagIds.length > 0) {
      url += this._selectedTagIds.map(id => `&tag_ids[]=${id}`).join("")
    }
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

      // Update Financial Pulse strip
      if (data.pulse && this.hasPulseStripTarget) this._updatePulseStrip(data.pulse)
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
      buckets: this._renderBuckets,
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

    // CM-25: Disable prev button at earliest allowed month
    const atEarliest = this.currentYear === this.earliestYear && this.currentMonth <= this.earliestMonth
    this.prevBtnTargets.forEach(btn => {
      if (atEarliest) {
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
    // Auto-expand for Spending Control panel, Net Worth History, Income & Spending Details, Goal Progress, and Recent Activity
    if (wrapper.dataset.cardType === 'spending_overview' || wrapper.dataset.cardType === 'net_worth' || wrapper.dataset.cardType === 'income_spending' || wrapper.dataset.cardType === 'buckets' || wrapper.dataset.cardType === 'recent_activity') {
      this._expandCard(wrapper)
    }
  }

  flipCardBack(event) {
    const wrapper = event.target.closest("[data-dashboard-target='slotWrapper']")
    if (!wrapper) return
    // Auto-collapse for Spending Control panel, Net Worth History, Income & Spending Details, Goal Progress, and Recent Activity
    if ((wrapper.dataset.cardType === 'spending_overview' && this.expandedCardType === 'spending_overview') ||
        (wrapper.dataset.cardType === 'net_worth' && this.expandedCardType === 'net_worth') ||
        (wrapper.dataset.cardType === 'income_spending' && this.expandedCardType === 'income_spending') ||
        (wrapper.dataset.cardType === 'buckets' && this.expandedCardType === 'buckets') ||
        (wrapper.dataset.cardType === 'recent_activity' && this.expandedCardType === 'recent_activity')) {
      this._collapseCard()
    }
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

  async loadMorePayments(event) {
    const wrapper = event.target.closest("[data-dashboard-target='slotWrapper']")
    if (!wrapper) return
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    const currentPage = parseInt(content.dataset.currentPage || "1")
    const hasMore = content.dataset.hasMore === "true"
    if (!hasMore) return

    const nextPage = currentPage + 1
    let url = `${this.recentActivityUrlValue}?month=${this.currentMonth}&year=${this.currentYear}&page=${nextPage}`
    if (this._selectedTagIds && this._selectedTagIds.length > 0) {
      url += this._selectedTagIds.map(id => `&tag_ids[]=${id}`).join("")
    }

    // Show loading state
    const sentinel = content.querySelector("[data-role='load-more-sentinel']")
    if (sentinel) sentinel.innerHTML = '<span class="text-xs text-gray-400 dark:text-gray-500">Loading...</span>'

    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      const data = await res.json()
      const colors = ["blue", "green", "purple", "amber", "sky"]
      const existingItems = content.querySelectorAll("li:not([data-role='load-more-sentinel'])")
      const colorOffset = existingItems.length

      let html = ""
      ;(data.recent || []).forEach((p, i) => {
        const c = colors[(colorOffset + i) % colors.length]
        html += `<li class="flex items-center justify-between">
          <div class="flex items-center space-x-2 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-${c}-100 dark:bg-${c}-900/30 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-${c}-500 dark:text-${c}-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a5 5 0 00-10 0v2M12 12v3m-3-3h6m-9 7h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2z"/>
              </svg>
            </span>
            <span class="text-sm text-gray-700 dark:text-gray-300 truncate"><span class="text-gray-400 dark:text-gray-500">${this._esc(p.date)}</span> ${this._esc(p.description)}</span>
          </div>
          <span class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums flex-shrink-0 ml-2">${this._currency(p.amount)}</span>
        </li>`
      })

      if (sentinel) sentinel.remove()
      content.insertAdjacentHTML("beforeend", html)

      content.dataset.currentPage = String(nextPage)
      content.dataset.hasMore = String(data.has_more)

      if (data.has_more) {
        const remaining = data.total_count - (nextPage * data.per_page)
        content.insertAdjacentHTML("beforeend", `<li class="text-center py-2" data-role="load-more-sentinel">
          <button type="button" class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
                  data-action="click->dashboard#loadMorePayments">Load more (${remaining} remaining)</button>
        </li>`)
      }
    } catch (e) { /* silently fail */ }
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
    wrapper.setAttribute("data-expanded", "true")
    this.expandedCardType = wrapper.dataset.cardType
    if (this.sortable) this.sortable.option("disabled", true)

    // Center content in expanded mode with bounded width + lift height cap
    const isWideCard = wrapper.dataset.cardType === 'spending_overview'
    wrapper.querySelectorAll("[data-role='card-content'], [data-role='front-content'], [data-role='back-content']").forEach(el => {
      el.style.maxWidth = isWideCard ? "100%" : "1000px"
      el.style.marginLeft = "auto"
      el.style.marginRight = "auto"
      el.style.width = "100%"
      el.style.maxHeight = "none"
    })

    // Piston open: scroll to the top of the expanded card after render
    requestAnimationFrame(() => {
      wrapper.scrollIntoView({ block: "start", behavior: "instant" })
      // Also reset any internal scroll containers
      wrapper.querySelectorAll("[data-role='card-content']").forEach(el => { el.scrollTop = 0 })
    })
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

    // Remove expanded centering styles + restore height cap
    wrapper.querySelectorAll("[data-role='card-content'], [data-role='front-content'], [data-role='back-content']").forEach(el => {
      el.style.maxWidth = ""
      el.style.marginLeft = ""
      el.style.marginRight = ""
      el.style.width = ""
      el.style.maxHeight = ""
    })

    this._updateExpandIcons(wrapper, false)
    wrapper.removeAttribute("data-expanded")
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
    const content = wrapper.querySelector("[data-role='card-content']")
    if (content) {
      const spent = data.spent || 0
      const opBal = data.operating_balance || 0

      content.innerHTML = `
        <div class="flex flex-col flex-1 justify-center py-4 space-y-6" style="font-variant-numeric: tabular-nums;">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Spent This Month</span>
            <span class="text-2xl font-bold text-gray-800 dark:text-gray-100" style="font-size: 2rem;">${this._currency(spent)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Cash In Spending Accounts</span>
            <span class="text-2xl font-bold text-gray-800 dark:text-gray-100" style="font-size: 2rem;">${this._currency(opBal)}</span>
          </div>
        </div>`
    }

    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      const categories = data.categories || []
      const types = data.types || []
      const tags = data.tags || []
      const deposits = data.deposits_breakdown || []
      const spentTotal = data.spent || 0
      const incomeTotal = data.income_total || 0

      const buildColumn = (title, items, total) => {
        let rows = ''
        if (items.length > 0) {
          for (const item of items) {
            rows += `<div class="flex items-baseline justify-between gap-1">
              <span class="text-[11px] text-gray-700 dark:text-gray-300 truncate">${this._esc(item.name)}</span>
              <span class="text-[11px] font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">${this._currency(item.amount)} <span class="text-[9px] text-gray-400 dark:text-gray-500">${(item.pct || 0).toFixed(1)}%</span></span>
            </div>`
          }
        } else {
          rows = `<p class="text-[11px] text-gray-400 dark:text-gray-500">None this month.</p>`
        }
        let totalRow = ''
        if (items.length > 0) {
          totalRow = `<div class="border-t border-gray-200 dark:border-gray-600 mt-2 pt-1">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-gray-800 dark:text-gray-200">Total</span>
              <span class="text-[11px] font-bold text-gray-800 dark:text-gray-200">${this._currency(total)}</span>
            </div>
          </div>`
        }
        return `<div class="flex flex-col min-w-0">
          <p class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b border-gray-200 dark:border-gray-600">${title}</p>
          <div class="flex-1 space-y-0.5">${rows}</div>
          ${totalRow}
        </div>`
      }

      const tagTotal = tags.reduce((s, t) => s + (t.amount || 0), 0)

      backContent.innerHTML = `<div class="overflow-x-auto py-3"><div class="grid grid-cols-4 gap-4" style="font-variant-numeric: tabular-nums; min-width: 560px;">
        ${buildColumn('By Category', categories, spentTotal)}
        ${buildColumn('By Spending Type', types, spentTotal)}
        ${buildColumn('By Tag', tags, tagTotal)}
        ${buildColumn('Deposits', deposits, incomeTotal)}
      </div></div>`
    }
  }

  _renderSpendingContext(data) {
    let h = ''
    if (data.comparison_pct != null) {
      const pct = data.comparison_pct
      const isOver = pct > 0
      const color = isOver ? 'text-red-500' : 'text-green-500'
      const sign = isOver ? '+' : ''
      const word = isOver ? 'above' : 'below'
      h += `<p class="text-[11px] ${color} mt-0.5">${sign}${Math.abs(pct).toFixed(1)}% ${word} ${data.comparison_label || 'planned'}</p>`
    }
    if (data.daily_avg != null) {
      h += `<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Daily Avg: ${this._currency(data.daily_avg)}</p>`
    }
    if (data.projected_month_end != null) {
      h += `<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Projected: ${this._currency(data.projected_month_end)}</p>`
    }
    return h
  }

  _renderAccountsOverview(wrapper, data) {
    if (!data) return
    const accounts = data.accounts || []
    const total = data.total || 0
    const liquidTotal = data.liquid_total || 0
    const liquidCount = data.liquid_count || 0

    const reportIcon = `<a class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition" aria-label="Open accounts report" href="/reports/account_balance_history"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 16V9m4 7V5m4 11v-4m4 4V8"/></svg></a>`

    const frontContent = wrapper.querySelector("[data-role='front-content']")
    if (frontContent) {
      let html = `
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Accounts</h2>
          ${reportIcon}
        </div>`

      if (accounts.length === 0) {
        html += `<p class="text-sm text-gray-400 dark:text-gray-500">No accounts yet.</p>`
      } else {
        const plural = liquidCount === 1 ? '' : 's'
        html += `<div class="flex flex-col items-center justify-center py-4">
          <span class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">Total Cash: ${this._currency(liquidTotal)}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400 mt-1">Across ${liquidCount} liquid account${plural}</span>
        </div>`
      }
      frontContent.innerHTML = html
    }

    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      // Group accounts by account_group from API
      const liquidAccts = accounts.filter(a => a.account_group === "liquid").sort((a, b) => b.balance - a.balance)
      const creditAccts = accounts.filter(a => a.account_group === "credit").sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      const loanAccts = accounts.filter(a => a.account_group === "loan").sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      const liquidSum = liquidAccts.reduce((s, a) => s + a.balance, 0)
      const creditSum = creditAccts.reduce((s, a) => s + Math.abs(a.balance), 0)
      const loanSum = loanAccts.reduce((s, a) => s + Math.abs(a.balance), 0)

      let html = `
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Account Groups</h2>
          ${reportIcon}
        </div>`

      if (accounts.length === 0) {
        html += `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No account data available.</p>`
      } else {
        const chevron = `<svg data-chevron class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
        const sectionToggle = `onclick="this.closest('[data-acct-section]').querySelector('[data-section-body]').classList.toggle('hidden'); this.querySelector('[data-chevron]').classList.toggle('rotate-90')"`

        // 1) Liquid Accounts (expanded by default)
        html += this._acctGroupSection("liquid", "Liquid Accounts", liquidAccts, liquidSum, false, chevron, sectionToggle)
        // 2) Credit Accounts (collapsed by default)
        html += this._acctGroupSection("credit", "Credit Accounts", creditAccts, creditSum, true, chevron, sectionToggle)
        // 3) Loans / Financing (collapsed by default)
        html += this._acctGroupSection("loans", "Loans / Financing", loanAccts, loanSum, true, chevron, sectionToggle)
      }
      backContent.innerHTML = html
    }
  }

  _acctGroupSection(key, label, accts, total, collapsed, chevron, toggleAttr) {
    const isLiability = key !== "liquid"
    const totalColor = isLiability ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white"
    const balColor = isLiability ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white"
    const displayTotal = isLiability && total > 0 ? `-${this._currency(total)}` : this._currency(total)
    const chevronClass = collapsed ? "" : " rotate-90"
    const bodyClass = collapsed ? " hidden" : ""
    const emptyLabel = key === "liquid" ? "No liquid accounts." : key === "credit" ? "No credit accounts." : "No loan accounts."
    const subtotalLabel = key === "liquid" ? "Total Liquid" : key === "credit" ? "Total Credit" : "Total Loans"

    let html = `<div class="mb-3" data-acct-section="${key}">
      <button type="button" ${toggleAttr} class="flex items-center justify-between w-full text-left">
        <div class="flex items-center space-x-1.5">
          ${chevron.replace('class="', `class="${chevronClass} `)}
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${label}</span>
        </div>
        <span class="text-xs font-semibold ${totalColor} tabular-nums">${displayTotal}</span>
      </button>
      <div data-section-body class="mt-1.5${bodyClass}">`

    if (accts.length > 0) {
      html += `<ul class="space-y-1">`
      accts.forEach(a => {
        const displayBal = isLiability ? this._currency(-Math.abs(a.balance)) : this._currency(a.balance)
        html += `<li class="flex items-center justify-between pl-5">
          <span class="text-xs text-gray-700 dark:text-gray-300 truncate mr-1">${this._esc(a.name)}</span>
          <span class="text-xs font-semibold ${balColor} tabular-nums flex-shrink-0">${displayBal}</span>
        </li>`
      })
      html += `</ul>
        <div class="flex items-center justify-between pl-5 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
          <span class="text-xs font-semibold text-gray-600 dark:text-gray-400">${subtotalLabel}</span>
          <span class="text-xs font-semibold ${totalColor} tabular-nums">${displayTotal}</span>
        </div>`
    } else {
      html += `<p class="text-xs text-gray-400 dark:text-gray-500 pl-5">${emptyLabel}</p>`
    }
    html += `</div></div>`
    return html
  }

  _renderNetWorth(wrapper, data) {
    if (!data) return
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    const value = data.value || 0
    const change = data.change || 0
    const changePct = data.change_pct || 0
    const snapshots = data.snapshots || []

    // Calm Snapshot: Net Worth value + optional monthly change
    let html = `<div class="flex flex-col items-center justify-center py-4">`
    html += `<span class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">Net Worth: ${this._currency(value)}</span>`
    if (snapshots.length >= 2) {
      const changeStr = change >= 0 ? `+${this._currency(change)}` : this._currency(change)
      html += `<span class="text-sm text-gray-500 dark:text-gray-400 mt-1 tabular-nums">Change this month: ${changeStr}</span>`
    }
    html += `</div>`
    content.innerHTML = html

    // Back-of-card: Net Worth Breakdown (chart + asset/liability columns + summary)
    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      let bhtml = ""
      const assets = data.assets || 0
      const liabilities = data.liabilities || 0
      const assetItems = data.asset_items || []
      const liabilityItems = data.liability_items || []

      // Section 1: Chart
      if (snapshots.length >= 2) {
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

        bhtml += `<div class="w-full h-16 relative mb-0.5"><svg viewBox="0 0 200 60" class="w-full h-full" preserveAspectRatio="none">`
        bhtml += `<defs><linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a855f7" stop-opacity="0.3"/><stop offset="100%" stop-color="#a855f7" stop-opacity="0"/></linearGradient></defs>`
        bhtml += `<path d="${areaPath}" fill="url(#netWorthGrad)"/>`
        bhtml += `<polyline points="${polylineStr}" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
        points.forEach(p => { bhtml += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#a855f7"/>` })
        bhtml += `</svg></div>`
        bhtml += `<div class="flex justify-between text-center mb-3">`
        snapshots.forEach(s => {
          const shortLabel = s.label.split(" ")[0]
          bhtml += `<div class="flex flex-col items-center"><span class="text-[10px] text-gray-400 dark:text-gray-500">${this._esc(shortLabel)}</span><span class="text-[9px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">${this._currency0(s.amount)}</span></div>`
        })
        bhtml += `</div>`
      } else {
        const msg = snapshots.length === 0 ? "No history yet" : "Not enough data for chart."
        bhtml += `<div class="w-full py-3 flex items-center justify-center"><p class="text-xs text-gray-400 dark:text-gray-500">${msg}</p></div>`
      }

      // Section 2: Asset / Liability Breakdown
      bhtml += `<div class="grid grid-cols-2 gap-4 mb-3">`
      // Assets column
      bhtml += `<div><div class="flex items-center justify-between mb-1.5"><span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assets</span><span class="text-[10px] font-semibold text-gray-900 dark:text-white tabular-nums">${this._currency(assets)}</span></div>`
      if (assetItems.length > 0) {
        bhtml += `<div class="space-y-0.5">`
        assetItems.forEach(i => {
          bhtml += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-600 dark:text-gray-400 truncate mr-1">${this._esc(i.name)}</span><span class="text-[11px] font-medium text-gray-900 dark:text-white tabular-nums flex-shrink-0">${this._currency(i.value)}</span></div>`
        })
        bhtml += `</div>`
      } else { bhtml += `<p class="text-[10px] text-gray-400 dark:text-gray-500">No assets.</p>` }
      bhtml += `</div>`
      // Liabilities column
      bhtml += `<div><div class="flex items-center justify-between mb-1.5"><span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Liabilities</span><span class="text-[10px] font-semibold text-red-500 dark:text-red-400 tabular-nums">${liabilities > 0 ? "-" : ""}${this._currency(liabilities)}</span></div>`
      if (liabilityItems.length > 0) {
        bhtml += `<div class="space-y-0.5">`
        liabilityItems.forEach(i => {
          bhtml += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-600 dark:text-gray-400 truncate mr-1">${this._esc(i.name)}</span><span class="text-[11px] font-medium text-red-500 dark:text-red-400 tabular-nums flex-shrink-0">-${this._currency(i.value)}</span></div>`
        })
        bhtml += `</div>`
      } else { bhtml += `<p class="text-[10px] text-gray-400 dark:text-gray-500">No liabilities.</p>` }
      bhtml += `</div></div>`

      // Section 3: Large Net Worth Summary
      const nwColor = value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      bhtml += `<div class="border-t border-gray-200 dark:border-gray-600 pt-2 text-center"><span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Worth</span><div class="text-xl font-bold tabular-nums mt-0.5 ${nwColor}">${this._currency(value)}</div></div>`

      backContent.innerHTML = bhtml
    }
  }

  _renderIncomeSpending(wrapper, data) {
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    // Calm Snapshot: 4-line equation stack (Instruction N)
    content.innerHTML = `
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Beginning Balance</span>
          <span class="text-sm text-gray-700 dark:text-gray-300 tabular-nums">${this._currency(data.beginning_balance)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">+ Deposits</span>
          <span class="text-sm text-gray-700 dark:text-gray-300 tabular-nums">${this._currency(data.income)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">\u2212 Payments</span>
          <span class="text-sm text-gray-700 dark:text-gray-300 tabular-nums">${this._currency(data.expenses)}</span>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
        <div class="flex items-center justify-between">
          <span class="text-base font-bold text-gray-900 dark:text-white">= Current Balance</span>
          <span class="text-base font-bold text-gray-900 dark:text-white tabular-nums">${this._currency(data.current_balance)}</span>
        </div>
      </div>`

    // Back-of-card: Expanded Clarity (Instruction O)
    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      const nc = data.net_change != null ? data.net_change : (data.income - data.expenses)
      const ncStr = nc >= 0 ? `+${this._currency(nc)}` : this._currency(nc)
      let bhtml = ""
      // Equation stack at top
      bhtml += `<div class="space-y-1 mb-3">`
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-500 dark:text-gray-400">Beginning Balance</span><span class="text-xs text-gray-600 dark:text-gray-300 tabular-nums">${this._currency(data.beginning_balance)}</span></div>`
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-500 dark:text-gray-400">+ Deposits</span><span class="text-xs text-gray-600 dark:text-gray-300 tabular-nums">${this._currency(data.income)}</span></div>`
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-500 dark:text-gray-400">\u2212 Payments</span><span class="text-xs text-gray-600 dark:text-gray-300 tabular-nums">${this._currency(data.expenses)}</span></div>`
      bhtml += `<div class="border-t border-gray-200 dark:border-gray-600 my-0.5"></div>`
      bhtml += `<div class="flex items-center justify-between"><span class="text-sm font-bold text-gray-900 dark:text-white">= Current Balance</span><span class="text-sm font-bold text-gray-900 dark:text-white tabular-nums">${this._currency(data.current_balance)}</span></div>`
      bhtml += `</div>`
      // Net Change
      bhtml += `<div class="flex items-center justify-between mb-3"><span class="text-xs text-gray-500 dark:text-gray-400">Net Change</span><span class="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">${ncStr}</span></div>`
      // Top 3 Payments
      bhtml += `<div class="mb-3"><span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top Payments</span>`
      const topPay = data.top_payments || []
      if (topPay.length > 0) {
        bhtml += `<div class="mt-1 space-y-1">`
        topPay.forEach(p => {
          bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">${this._esc(p.category)}</span><span class="text-xs text-gray-700 dark:text-gray-300 tabular-nums">${this._currency(p.amount)}</span></div>`
        })
        bhtml += `</div>`
      } else {
        bhtml += `<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">No payments this month.</p>`
      }
      bhtml += `</div>`
      // Top 3 Deposits
      bhtml += `<div><span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top Deposits</span>`
      const topDep = data.top_deposits || []
      if (topDep.length > 0) {
        bhtml += `<div class="mt-1 space-y-1">`
        topDep.forEach(d => {
          bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">${this._esc(d.source)}</span><span class="text-xs text-gray-700 dark:text-gray-300 tabular-nums">${this._currency(d.amount)}</span></div>`
        })
        bhtml += `</div>`
      } else {
        bhtml += `<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">No deposits this month.</p>`
      }
      bhtml += `</div>`
      backContent.innerHTML = bhtml
    }
  }

  _renderRecentActivity(wrapper, data) {
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    // Front side: Recent Payments only
    const payments = data.payments || data.recent || []
    const paymentCount = data.payment_count || payments.length
    const paymentTotal = payments.reduce((sum, i) => sum + i.amount, 0)

    const summary = wrapper.querySelector("[data-role='activity-summary']")
    if (summary) {
      summary.innerHTML = `<span class="text-xs font-medium tabular-nums text-red-400/80 dark:text-red-400/60">Total: \u2212${this._currency(paymentTotal)}</span>` +
        `<span class="text-xs text-gray-400 dark:text-gray-500">${paymentCount} payment${paymentCount === 1 ? "" : "s"}</span>`
    }

    if (payments.length === 0) {
      content.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No payments this month.</p>`
    } else {
      let html = `<div class="space-y-1.5">`
      payments.forEach(item => {
        html += `<div class="flex items-center justify-between">
          <div class="min-w-0 flex-1 mr-2">
            <span class="text-[11px] text-gray-400 dark:text-gray-500">${this._esc(item.date)}</span>
            <span class="text-xs text-gray-700 dark:text-gray-300 truncate">${this._esc(item.description)}</span>
          </div>
          <span class="text-xs font-medium text-red-400/80 dark:text-red-400/60 tabular-nums flex-shrink-0">\u2212${this._currency(item.amount)}</span>
        </div>`
      })
      html += `</div>`
      content.innerHTML = html
    }

    // Back side: Recent Deposits only
    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      const deposits = data.deposits || []
      const depositCount = data.deposit_count || deposits.length
      const depositTotal = deposits.reduce((sum, i) => sum + i.amount, 0)

      const depositSummary = wrapper.querySelector("[data-role='deposit-summary']")
      if (depositSummary) {
        depositSummary.innerHTML = `<span class="text-xs font-medium tabular-nums text-emerald-500/80 dark:text-emerald-400/70">Total: +${this._currency(depositTotal)}</span>` +
          `<span class="text-xs text-gray-400 dark:text-gray-500">${depositCount} deposit${depositCount === 1 ? "" : "s"}</span>`
      }

      if (deposits.length === 0) {
        backContent.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No deposits this month.</p>`
      } else {
        let bhtml = `<div class="space-y-1.5">`
        deposits.forEach(item => {
          bhtml += `<div class="flex items-center justify-between">
            <div class="min-w-0 flex-1 mr-2">
              <span class="text-[11px] text-gray-400 dark:text-gray-500">${this._esc(item.date)}</span>
              <span class="text-xs text-gray-700 dark:text-gray-300 truncate">${this._esc(item.description)}</span>
            </div>
            <span class="text-xs font-medium text-emerald-500/80 dark:text-emerald-400/70 tabular-nums flex-shrink-0">+${this._currency(item.amount)}</span>
          </div>`
        })
        bhtml += `</div>`
        backContent.innerHTML = bhtml
      }
    }
  }

  _renderBuckets(wrapper, data) {
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    if (!data || data.empty) {
      content.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center">No buckets yet. Create one to start allocating money.</p>`
      return
    }

    // Calm Goals Snapshot (Instruction P)
    let html = `<span class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">${this._currency(data.total_balance)} saved in goals</span>`
    html += `<span class="text-sm text-gray-500 dark:text-gray-400 mt-1">Across ${data.count} active bucket${data.count !== 1 ? "s" : ""}</span>`

    // Optional largest bucket line
    const buckets = data.buckets || []
    if (buckets.length > 1) {
      const largest = buckets.reduce((a, b) => (b.balance || 0) > (a.balance || 0) ? b : a, buckets[0])
      if (largest) {
        html += `<span class="text-xs text-gray-400 dark:text-gray-500 mt-2 tabular-nums">Largest: ${this._esc(largest.name)} (${this._currency(largest.balance)})</span>`
      }
    }

    content.innerHTML = html

    // Back-of-card: Structured Goal Progress (Instruction Q)
    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      let bhtml = `<div class="text-center mb-3"><span class="text-lg font-bold text-gray-900 dark:text-white tabular-nums">${this._currency(data.total_balance)} saved in goals</span></div>`
      bhtml += `<div class="space-y-3">`
      for (const b of buckets) {
        const hasTarget = b.target != null && b.target > 0
        bhtml += `<div>`
        bhtml += `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-gray-900 dark:text-white">${this._esc(b.name)}</span><span class="text-xs text-gray-600 dark:text-gray-300 tabular-nums">${this._currency(b.balance)}</span></div>`
        if (hasTarget) {
          const pct = Math.min((b.balance / b.target * 100), 100).toFixed(1)
          const remaining = Math.max(b.target - b.balance, 0)
          const barColor = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-gray-400" : "bg-gray-300"
          bhtml += `<div class="flex items-center justify-between mt-0.5"><span class="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">Target: ${this._currency(b.target)}</span>`
          if (remaining > 0) {
            bhtml += `<span class="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">${this._currency(remaining)} remaining</span>`
          }
          bhtml += `</div>`
          bhtml += `<div class="mt-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden"><div class="${barColor} h-full rounded-full" style="width: ${pct}%"></div></div>`
        }
        bhtml += `</div>`
      }
      bhtml += `</div>`
      backContent.innerHTML = bhtml
    }
  }

  // --- Helpers ---

  _currency(val) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0)
  }

  _currency0(val) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0)
  }

  _updatePulseStrip(pulse) {
    const warn = `<svg class="inline w-3 h-3 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>`
    const parts = [`<span class="font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider" style="font-size: 10px;">Financial Pulse</span>`]
    if (pulse.liquidity != null) {
      const cls = pulse.liquidity < 1.0 ? "text-amber-600 dark:text-amber-400 font-medium" : ""
      parts.push(`<span class="${cls}">Cash ${pulse.liquidity} mo${pulse.liquidity < 1.0 ? " " + warn : ""}</span>`)
    }
    if (pulse.debt_ratio != null) {
      const cls = pulse.debt_ratio > 100 ? "text-red-600 dark:text-red-400 font-medium" : ""
      parts.push(`<span class="${cls}">Debt ${pulse.debt_ratio}%${pulse.debt_ratio > 100 ? " " + warn : ""}</span>`)
    } else {
      parts.push(`<span>Debt &mdash;</span>`)
    }
    if (pulse.savings_rate != null) {
      parts.push(`<span>Savings ${pulse.savings_rate}%</span>`)
    } else {
      parts.push(`<span>Savings &mdash;</span>`)
    }
    this.pulseStripTarget.innerHTML = parts.join("")
  }

  _esc(str) {
    if (!str) return ""
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  // --- Dashboard State Persistence ---

  get _storageKey() {
    const userId = document.querySelector('meta[name="user-id"]')?.content
    return userId ? `bhDash_${userId}` : 'bhDash'
  }

  _saveState() {
    try {
      const state = {
        flippedCardTypes: this._getFlippedCardTypes(),
        expandedCardType: this.expandedCardType || null,
        selectedTagIds: [...this._selectedTagIds],
        month: this.currentMonth,
        year: this.currentYear,
        scrollPositions: this._getScrollPositions(),
        savedAt: Date.now()
      }
      sessionStorage.setItem(this._storageKey, JSON.stringify(state))
    } catch (e) { /* sessionStorage may be full or disabled */ }
  }

  _getFlippedCardTypes() {
    const flipped = []
    this.slotWrapperTargets.forEach(wrapper => {
      const flipper = wrapper.querySelector("[data-role='flipper']")
      if (flipper && flipper.style.transform === "rotateY(180deg)") {
        flipped.push(wrapper.dataset.cardType)
      }
    })
    return flipped
  }

  _getScrollPositions() {
    const positions = {}
    this.slotWrapperTargets.forEach(wrapper => {
      const cardType = wrapper.dataset.cardType
      const scrollables = wrapper.querySelectorAll(
        "[data-role='card-content'], [data-role='front-content'], [data-role='back-content']"
      )
      const cardScrolls = []
      scrollables.forEach(el => {
        if (el.scrollTop > 0) {
          cardScrolls.push({ role: el.dataset.role, scrollTop: el.scrollTop })
        }
      })
      if (cardScrolls.length > 0) positions[cardType] = cardScrolls
    })
    return positions
  }

  _restoreScrollPositions(positions) {
    if (!positions || typeof positions !== 'object') return
    requestAnimationFrame(() => {
      for (const [cardType, scrolls] of Object.entries(positions)) {
        const wrapper = this.slotWrapperTargets.find(w => w.dataset.cardType === cardType)
        if (!wrapper) continue
        for (const entry of scrolls) {
          const el = wrapper.querySelector(`[data-role='${entry.role}']`)
          if (el) el.scrollTop = entry.scrollTop
        }
      }
    })
  }

  _restoreState() {
    try {
      const raw = sessionStorage.getItem(this._storageKey)
      if (!raw) return false

      const state = JSON.parse(raw)

      // Ignore state older than 2 hours
      if (state.savedAt && Date.now() - state.savedAt > 120 * 60 * 1000) {
        sessionStorage.removeItem(this._storageKey)
        return false
      }

      // 0. Restore month/year if saved and different from server-rendered values
      let needsFetch = false
      if (state.month && state.year) {
        if (state.month !== this.currentMonth || state.year !== this.currentYear) {
          this.currentMonth = state.month
          this.currentYear = state.year
          this._updateArrowState()
          needsFetch = true
        }
      }

      // 1. Restore flipped cards (suppress transition to prevent visible flip animation)
      if (Array.isArray(state.flippedCardTypes) && state.flippedCardTypes.length > 0) {
        const flippers = []
        for (const cardType of state.flippedCardTypes) {
          const wrapper = this.slotWrapperTargets.find(w => w.dataset.cardType === cardType)
          if (!wrapper) continue
          const flipper = wrapper.querySelector("[data-role='flipper']")
          if (!flipper) continue
          flipper.style.transition = "none"
          flipper.style.transform = "rotateY(180deg)"
          flippers.push(flipper)
          const front = wrapper.querySelector("[data-role='front']")
          const back = wrapper.querySelector("[data-role='back']")
          if (front) front.style.pointerEvents = "none"
          if (back) back.style.pointerEvents = "auto"
        }
        // Re-enable transition after browser paints the restored state
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            flippers.forEach(f => { f.style.transition = "" })
          })
        })
      }

      // 2. Restore expanded card
      if (state.expandedCardType) {
        const wrapper = this.slotWrapperTargets.find(
          w => w.dataset.cardType === state.expandedCardType
        )
        if (wrapper) this._expandCard(wrapper)
      }

      // 3. Restore tag filter selections
      if (Array.isArray(state.selectedTagIds) && state.selectedTagIds.length > 0) {
        this._selectedTagIds = [...state.selectedTagIds]
        this._updateTagFilterLabel()
        needsFetch = true
      }

      // 4. Fetch data if month or tags changed, then restore scroll positions
      const scrollPos = state.scrollPositions
      if (needsFetch) {
        this._fetchAndRender().then(() => this._restoreScrollPositions(scrollPos))
      } else {
        const now = new Date()
        if (this.currentMonth !== now.getMonth() + 1 || this.currentYear !== now.getFullYear()) {
          this._fetchAndRender().then(() => this._restoreScrollPositions(scrollPos))
        } else {
          this._restoreScrollPositions(scrollPos)
        }
      }

      return true
    } catch (e) {
      return false
    }
  }
}
