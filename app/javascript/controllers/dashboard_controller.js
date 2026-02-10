import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "monthLabel", "prevBtn", "nextBtn",
    "card1Content", "card4Content", "card5Content"
  ]
  static values = { apiUrl: String, month: Number, year: Number }

  connect() {
    this.currentMonth = this.monthValue
    this.currentYear = this.yearValue
    this._updateArrowState()
  }

  prevMonth() {
    this.currentMonth--
    if (this.currentMonth < 1) {
      this.currentMonth = 12
      this.currentYear--
    }
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
    this._fetchAndRender()
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

  // --- Card 1: Spending Overview ---

  _renderCard1(data) {
    const spent = this._currency(data.spent)
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
