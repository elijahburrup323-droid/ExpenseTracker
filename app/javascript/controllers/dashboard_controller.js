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
    wrapper.querySelectorAll("[data-role='card-content'], [data-role='front-content'], [data-role='back-content']").forEach(el => {
      el.style.maxWidth = "1000px"
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
      const avg = data.three_month_avg
      const hasPlan = avg != null && avg > 0
      const remaining = hasPlan ? (avg - spent) : 0
      const daysRemaining = data.days_remaining || 0

      let headlineText
      if (hasPlan) {
        headlineText = `${this._currency0(Math.abs(remaining))} ${remaining >= 0 ? 'remaining' : 'over plan'}`
      } else {
        headlineText = `${this._currency0(spent)} spent this month`
      }

      let secondaryHtml = ''
      if (hasPlan) {
        secondaryHtml = `<p class="text-sm text-gray-500 dark:text-gray-400 mb-2" style="font-variant-numeric: tabular-nums;">${this._currency0(spent)} of ${this._currency0(avg)} planned</p>`
      }

      let pacingHtml = ''
      if (hasPlan) {
        if (daysRemaining > 0) {
          if (remaining > 0) {
            pacingHtml = `<p class="text-[11px] text-gray-400 dark:text-gray-500" style="font-variant-numeric: tabular-nums;">${this._currency(remaining / daysRemaining)} per day available</p>`
          } else if (remaining === 0) {
            pacingHtml = `<p class="text-[11px] text-gray-400 dark:text-gray-500">Plan reached</p>`
          } else {
            pacingHtml = `<p class="text-[11px] text-amber-600 dark:text-amber-400" style="font-variant-numeric: tabular-nums;">Plan exceeded by ${this._currency0(Math.abs(remaining))}</p>`
          }
        } else {
          if (remaining >= 0) {
            pacingHtml = `<p class="text-[11px] text-gray-400 dark:text-gray-500">Finished under plan</p>`
          } else {
            pacingHtml = `<p class="text-[11px] text-amber-600 dark:text-amber-400" style="font-variant-numeric: tabular-nums;">Plan exceeded by ${this._currency0(Math.abs(remaining))}</p>`
          }
        }
      }

      content.innerHTML = `
        <div class="flex flex-col justify-center flex-1 py-2">
          <p class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">This Month</p>
          <p class="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-1" style="font-variant-numeric: tabular-nums;">${headlineText}</p>
          ${secondaryHtml}
          ${pacingHtml}
        </div>`
    }

    const backContent = wrapper.querySelector("[data-role='card-back-content']")
    if (backContent) {
      const categories = data.categories || []
      const types = data.types || []
      const tags = data.tags || []
      const colorMap = { blue: "#3b82f6", green: "#22c55e", gold: "#eab308", red: "#ef4444", purple: "#a855f7", pink: "#ec4899", indigo: "#6366f1", teal: "#14b8a6", orange: "#f97316", gray: "#6b7280" }

      const renderColumn = (items, listType) => {
        if (items.length === 0) return `<p class="text-xs text-gray-400 dark:text-gray-500 flex-1">No spending yet.</p>`
        let h = '<div class="space-y-1 flex-1">'
        for (const item of items) {
          const dotColor = listType === "tag" ? "var(--brand-400, #a855f7)" : (colorMap[item.color_key] || "#6b7280")
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
          h += `<div class="flex items-center justify-between">
              <div class="flex items-center space-x-1.5 min-w-0 flex-1">
                <span class="w-2 h-2 rounded-full flex-shrink-0" style="background: ${dotColor}"></span>
                <span class="text-xs text-gray-700 dark:text-gray-300 truncate">${this._esc(item.name)}</span>
              </div>
              <div class="flex items-center space-x-1 flex-shrink-0 ml-1">
                <span class="text-xs font-semibold text-gray-900 dark:text-white" style="font-variant-numeric: tabular-nums;">${this._currency(item.amount)}</span>
                <span class="text-[10px] text-gray-400 dark:text-gray-500 w-8 text-right" style="font-variant-numeric: tabular-nums;">${item.pct}%</span>
              </div>
            </div>
            ${listType === "type" && item.limit_pct != null ? limitHtml : ""}
            ${listType === "category" && item.limit != null ? limitHtml : ""}`
        }
        h += '</div>'
        return h
      }

      const columnTotal = (items) => {
        const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
        return this._currency(total)
      }

      const renderColumnTotal = (items) => {
        return `<div class="flex items-center justify-end mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-600">
          <div class="flex items-center space-x-1">
            <span class="text-xs font-semibold text-gray-900 dark:text-white" style="font-variant-numeric: tabular-nums;">${columnTotal(items)}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 w-8 text-right">&nbsp;</span>
          </div>
        </div>`
      }

      const renderEmptyTotal = () => {
        return `<div class="flex items-center justify-end mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-600">
          <span class="text-xs font-semibold text-gray-900 dark:text-white" style="font-variant-numeric: tabular-nums;">${this._currency(0)}</span>
        </div>`
      }

      const hasTags = tags.length > 0

      let html = `<div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;" data-role="breakdown-grid">`
      html += `<div class="flex flex-col"><p class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">By Category</p>${renderColumn(categories, "category")}${categories.length > 0 ? renderColumnTotal(categories) : renderEmptyTotal()}</div>`
      html += `<div class="flex flex-col"><p class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">By Spending Type</p>${renderColumn(types, "type")}${types.length > 0 ? renderColumnTotal(types) : renderEmptyTotal()}</div>`
      if (hasTags) {
        html += `<div class="flex flex-col"><p class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">By Tag</p>${renderColumn(tags, "tag")}${renderColumnTotal(tags)}</div>`
      }
      html += `</div>`
      backContent.innerHTML = html
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
      h += `<p class="text-[11px] ${color} mt-0.5">${sign}${Math.abs(pct).toFixed(1)}% ${word} ${data.comparison_label || '3-month avg'}</p>`
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
    const colors = ["blue", "green", "purple", "amber", "sky", "red"]
    const accounts = data.accounts || []
    const total = data.total || 0

    // Split into assets (DEBIT) and liabilities (CREDIT)
    const assetAccounts = accounts.filter(a => a.normal_balance_type !== "CREDIT").sort((a, b) => b.balance - a.balance)
    const liabilityAccounts = accounts.filter(a => a.normal_balance_type === "CREDIT").sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    const assetsSum = assetAccounts.reduce((s, a) => s + a.balance, 0)
    const liabilitiesSum = liabilityAccounts.reduce((s, a) => s + Math.abs(a.balance), 0)
    const barTotal = assetsSum + liabilitiesSum
    const assetsPct = barTotal > 0 ? Math.round(assetsSum / barTotal * 100) : 0
    const liabilitiesPct = barTotal > 0 ? Math.round(liabilitiesSum / barTotal * 100) : 0

    const bankIcon = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`

    const frontContent = wrapper.querySelector("[data-role='front-content']")
    if (frontContent) {
      let html = `
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Accounts</h2>
          <span class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">Accounts Total: ${this._currency(total)}</span>
        </div>`

      if (accounts.length === 0) {
        html += `<p class="text-sm text-gray-400 dark:text-gray-500">No accounts yet.</p>`
      } else {
        // Assets section
        html += `<div class="mb-3"><p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Assets</p>`
        if (assetAccounts.length > 0) {
          html += `<ul class="space-y-2">`
          assetAccounts.forEach((a, i) => {
            const c = colors[i % colors.length]
            html += `<li class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-6 h-6 rounded-md bg-${c}-100 dark:bg-${c}-900/30 flex items-center justify-center text-${c}-600 dark:text-${c}-400">${bankIcon}</span>
                <span class="text-sm text-gray-700 dark:text-gray-300">${this._esc(a.name)}</span>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">${this._currency(a.balance)}</span>
            </li>`
          })
          html += `</ul>
            <div class="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
              <span class="text-xs font-semibold text-gray-600 dark:text-gray-400">Total Assets</span>
              <span class="text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums">${this._currency(assetsSum)}</span>
            </div>`
        } else {
          html += `<p class="text-xs text-gray-400 dark:text-gray-500 ml-1">No asset accounts.</p>`
        }
        html += `</div>`

        // Liabilities section
        html += `<div><p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Liabilities</p>`
        if (liabilityAccounts.length > 0) {
          html += `<ul class="space-y-2">`
          liabilityAccounts.forEach((a) => {
            html += `<li class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-6 h-6 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">${bankIcon}</span>
                <span class="text-sm text-gray-700 dark:text-gray-300">${this._esc(a.name)}</span>
              </div>
              <span class="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">${this._currency(-Math.abs(a.balance))}</span>
            </li>`
          })
          html += `</ul>
            <div class="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
              <span class="text-xs font-semibold text-gray-600 dark:text-gray-400">Total Liabilities</span>
              <span class="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">${this._currency(liabilitiesSum)}</span>
            </div>`
        } else {
          html += `<p class="text-xs text-gray-400 dark:text-gray-500 ml-1">No liability accounts.</p>`
        }
        html += `</div>`
      }
      frontContent.innerHTML = html
    }

    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      let html = `
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Assets vs Liabilities</h2>
          <span class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">Accounts Total: ${this._currency(total)}</span>
        </div>`

      if (barTotal > 0) {
        // Horizontal bar comparison
        const aW = Math.max(assetsPct, 8)
        const lW = Math.max(liabilitiesPct, 8)
        html += `<div class="mb-4">
          <div class="flex h-8 rounded-lg overflow-hidden">`
        if (assetsPct > 0) {
          html += `<div class="bg-green-500 dark:bg-green-600 flex items-center justify-center" style="width:${aW}%">
            <span class="text-xs font-bold text-white">${assetsPct}%</span>
          </div>`
        }
        if (liabilitiesPct > 0) {
          html += `<div class="bg-red-500 dark:bg-red-600 flex items-center justify-center" style="width:${lW}%">
            <span class="text-xs font-bold text-white">${liabilitiesPct}%</span>
          </div>`
        }
        html += `</div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums">Assets: ${this._currency(assetsSum)}</span>
            <span class="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">Liabilities: ${this._currency(liabilitiesSum)}</span>
          </div>
        </div>`

        // Top 3 breakdown
        html += `<div class="grid grid-cols-2 gap-3">`
        html += `<div><p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Top Assets</p>`
        if (assetAccounts.length > 0) {
          html += `<ul class="space-y-1">`
          assetAccounts.slice(0, 3).forEach(a => {
            html += `<li class="flex items-center justify-between">
              <span class="text-xs text-gray-700 dark:text-gray-300 truncate mr-1">${this._esc(a.name)}</span>
              <span class="text-xs font-semibold text-gray-900 dark:text-white tabular-nums flex-shrink-0">${this._currency(a.balance)}</span>
            </li>`
          })
          html += `</ul>`
        } else {
          html += `<p class="text-xs text-gray-400 dark:text-gray-500">None</p>`
        }
        html += `</div>`

        html += `<div><p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Top Liabilities</p>`
        if (liabilityAccounts.length > 0) {
          html += `<ul class="space-y-1">`
          liabilityAccounts.slice(0, 3).forEach(a => {
            html += `<li class="flex items-center justify-between">
              <span class="text-xs text-gray-700 dark:text-gray-300 truncate mr-1">${this._esc(a.name)}</span>
              <span class="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums flex-shrink-0">${this._currency(Math.abs(a.balance))}</span>
            </li>`
          })
          html += `</ul>`
        } else {
          html += `<p class="text-xs text-gray-400 dark:text-gray-500">None</p>`
        }
        html += `</div></div>`
      } else {
        html += `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No account data available.</p>`
      }
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
    html += `<span class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">${this._currency(value)}</span>`
    if (change >= 0) {
      html += `<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded tabular-nums">+${this._currency(change)} (${changePct}%)</span>`
    } else {
      html += `<span class="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded tabular-nums">${this._currency(change)} (${changePct}%)</span>`
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

    // Asset / Liability breakdown
    html += `<div class="mt-2 space-y-1">`
    html += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-500 dark:text-gray-400">Assets</span><span class="text-[11px] font-medium text-gray-900 dark:text-white tabular-nums">${this._currency(data.assets || 0)}</span></div>`
    html += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-500 dark:text-gray-400">Liabilities</span><span class="text-[11px] font-medium text-gray-900 dark:text-white tabular-nums">${this._currency(data.liabilities || 0)}</span></div>`

    // Metric swap: Debt Ratio vs Cash Coverage
    const metricLabel = data.metric_label || "Debt Ratio"
    const metricValue = data.metric_value
    const metricMode = data.metric_mode || "debt_ratio"
    if (metricValue == null) {
      if (metricMode === "cash_coverage") {
        html += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-500 dark:text-gray-400">${this._esc(metricLabel)}</span><span class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">No Debt</span></div>`
      } else {
        html += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-500 dark:text-gray-400">${this._esc(metricLabel)}</span><span class="text-[11px] text-gray-400 dark:text-gray-500">\u2014</span></div>`
      }
    } else if (metricMode === "debt_ratio") {
      const drColor = metricValue > 100 ? 'text-red-600 dark:text-red-400' : metricValue <= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
      html += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-500 dark:text-gray-400">${this._esc(metricLabel)}</span><span class="text-[11px] font-medium ${drColor} tabular-nums">${metricValue.toFixed(1)}%</span></div>`
    } else {
      const ccColor = metricValue >= 100 ? 'text-emerald-600 dark:text-emerald-400' : metricValue >= 50 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
      html += `<div class="flex items-center justify-between"><span class="text-[11px] text-gray-500 dark:text-gray-400">${this._esc(metricLabel)}</span><span class="text-[11px] font-medium ${ccColor} tabular-nums">${metricValue.toFixed(1)}%</span></div>`
    }
    html += `</div>`
    content.innerHTML = html

    // Back-of-card: Net Worth breakdown
    const backContent = wrapper.querySelector("[data-role='back-content']")
    if (backContent) {
      const accts = data.accounts_subtotal || 0
      const assetMod = data.asset_module_total || 0
      const investMod = data.investment_module_total || 0
      const liabSub = data.liabilities_subtotal || 0
      let bhtml = `<div class="space-y-2">`
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-600 dark:text-gray-400">Accounts Total</span><span class="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">${this._currency(accts)}</span></div>`
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-600 dark:text-gray-400">Assets Total</span><span class="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">${this._currency(assetMod)}</span></div>`
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-600 dark:text-gray-400">Investments Total</span><span class="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">${this._currency(investMod)}</span></div>`
      bhtml += `<div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>`
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs text-gray-600 dark:text-gray-400">Liabilities Total</span><span class="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">\u2212${this._currency(liabSub)}</span></div>`
      bhtml += `<div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>`
      const nwColor = value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      bhtml += `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-gray-800 dark:text-gray-200">Net Worth</span><span class="text-xs font-bold ${nwColor} tabular-nums">${this._currency(value)}</span></div>`
      bhtml += `</div>`
      backContent.innerHTML = bhtml
    }
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
          <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+${this._currency(acct.beginning_balance)}</span>
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
        <span class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">${this._currency(data.beginning_balance)}</span>
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
        <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+${this._currency(data.income)}</span>
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
        <span class="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">${this._currency(data.expenses)}</span>
      </div>
      ${(() => {
        const nc = (data.net_change != null) ? data.net_change : (data.income - data.expenses)
        const ncPos = nc >= 0
        const ncColor = ncPos ? "emerald" : "red"
        const ncSign = ncPos ? "+" : "-"
        const sr = data.savings_rate
        const srColor = (sr != null && sr >= 0) ? "emerald" : "red"
        const srDisplay = (sr != null) ? sr + "%" : "\u2014"
        const srTextClass = (sr != null) ? "text-" + srColor + "-600 dark:text-" + srColor + "-400" : "text-gray-400 dark:text-gray-500"
        return '<div class="flex items-center justify-between">' +
          '<div class="flex items-center space-x-2">' +
            '<span class="w-6 h-6 rounded bg-' + ncColor + '-100 dark:bg-' + ncColor + '-900/30 flex items-center justify-center">' +
              '<svg class="w-3.5 h-3.5 text-' + ncColor + '-600 dark:text-' + ncColor + '-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>' +
            '</span>' +
            '<span class="text-sm text-gray-700 dark:text-gray-300">Net Change</span>' +
          '</div>' +
          '<span class="text-sm font-semibold text-' + ncColor + '-600 dark:text-' + ncColor + '-400 tabular-nums">' + ncSign + this._currency(Math.abs(nc)) + '</span>' +
        '</div>' +
        '<div class="flex items-center justify-between">' +
          '<div class="flex items-center space-x-2">' +
            '<span class="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">' +
              '<svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>' +
            '</span>' +
            '<span class="text-sm text-gray-700 dark:text-gray-300">Savings Rate</span>' +
          '</div>' +
          '<span class="text-sm font-semibold ' + srTextClass + ' tabular-nums">' + srDisplay + '</span>' +
        '</div>'
      })()}
      ${accountsHtml}
      <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span class="text-emerald-600 dark:text-emerald-400 text-xs font-bold">$</span>
          </span>
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">Current Balance</span>
        </div>
        <span class="text-sm font-bold text-gray-900 dark:text-white tabular-nums">${this._currency(data.current_balance)}</span>
      </div>`
  }

  _renderRecentActivity(wrapper, data) {
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return
    const payments = data.recent || []
    const totalCount = data.total_count || payments.length
    const hasMore = data.has_more || false
    const perPage = data.per_page || 10
    const colors = ["blue", "green", "purple", "amber", "sky"]

    // Update activity summary strip
    const summary = wrapper.querySelector("[data-role='activity-summary']")
    if (summary && data.net_activity != null) {
      const net = data.net_activity
      const count = data.transaction_count || 0
      const colorCls = net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      const sign = net >= 0 ? "+" : "-"
      summary.innerHTML = `<span class="text-xs font-medium tabular-nums ${colorCls}">Net: ${sign}${this._currency(Math.abs(net))}</span>` +
        `<span class="text-xs text-gray-400 dark:text-gray-500">${count} transaction${count === 1 ? "" : "s"}</span>`
    }

    // Reset pagination state
    content.dataset.currentPage = "1"
    content.dataset.hasMore = String(hasMore)
    content.dataset.totalCount = String(totalCount)

    if (payments.length === 0) {
      content.innerHTML = `<li class="text-sm text-gray-400 dark:text-gray-500">No payments this month.</li>`
      return
    }
    let html = ""
    payments.forEach((p, i) => {
      const c = colors[i % colors.length]
      html += `
        <li class="flex items-center justify-between">
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
    if (hasMore) {
      const remaining = totalCount - perPage
      html += `<li class="text-center py-2" data-role="load-more-sentinel">
        <button type="button" class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
                data-action="click->dashboard#loadMorePayments">Load more (${remaining} remaining)</button>
      </li>`
    }
    content.innerHTML = html
  }

  _renderBuckets(wrapper, data) {
    const content = wrapper.querySelector("[data-role='card-content']")
    if (!content) return

    if (!data || data.empty) {
      content.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No buckets yet. Create one to start allocating money.</p>`
      return
    }

    let html = `<div class="text-center mb-3">
      <span class="text-xs text-gray-500 dark:text-gray-400">${data.count} bucket${data.count !== 1 ? "s" : ""}</span>
      <div class="text-sm font-semibold text-gray-900 dark:text-white" style="font-variant-numeric: tabular-nums;">${this._currency(data.total_balance)}</div>
    </div><div class="space-y-2">`

    for (const b of (data.buckets || [])) {
      const defaultBadge = b.is_default
        ? ` <span class="text-[10px] font-medium text-brand-600 dark:text-brand-400">(Default)</span>`
        : ""

      let progressHtml = ""
      if (b.progress_pct != null) {
        const color = b.progress_pct >= 100 ? "bg-green-500" : b.progress_pct >= 50 ? "bg-brand-500" : "bg-yellow-500"
        progressHtml = `<div class="mx-auto mt-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden" style="max-width: 65%;">
          <div class="${color} h-full rounded-full" style="width: ${b.progress_pct}%"></div>
        </div>`
      }

      // Completion % display (right of balance)
      const pctHtml = b.progress_pct != null
        ? ` <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 ml-1">${b.progress_pct}%</span>`
        : ""

      // Remaining display (below progress bar)
      let remainingHtml = ""
      if (b.remaining != null && b.remaining > 0) {
        remainingHtml = `<div class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5" style="font-variant-numeric: tabular-nums;">Remaining: ${this._currency(b.remaining)}</div>`
      }

      html += `<div class="text-center py-1">
        <div class="text-sm font-semibold text-gray-900 dark:text-white">${this._esc(b.name)}${defaultBadge}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400" style="font-variant-numeric: tabular-nums;">${this._currency(b.balance)}${pctHtml}</div>
        ${progressHtml}
        ${remainingHtml}
      </div>`
    }
    html += `</div>`

    // Next Recommended Allocation line
    if (data.next_recommended) {
      html += `<div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-center">
        <div class="text-[10px] text-gray-500 dark:text-gray-400" style="font-variant-numeric: tabular-nums;">Next Recommended Allocation: <span class="font-semibold text-gray-700 dark:text-gray-300">${this._esc(data.next_recommended.name)}</span> (${this._currency(data.next_recommended.remaining)} remaining)</div>
      </div>`
    }

    content.innerHTML = html
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
