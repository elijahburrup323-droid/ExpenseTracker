import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "monthLabel", "checklistBody", "summaryBody",
    "reviewedTotals", "finalConfirmation",
    "closeButton", "errorBox", "successBox",
    "reopenBanner", "reopenBannerText",
    "reopenSection", "reopenButton", "reopenButtonLabel"
  ]
  static values = {
    statusUrl: String,
    confirmUrl: String,
    reopenUrl: String,
    dashboardUrl: String,
    csrfToken: String,
    monthLabel: String,
    nextMonthLabel: String
  }

  connect() {
    this.systemPassed = false
    this.isReopened = false
    this._fetchStatus()
    this._pollInterval = setInterval(() => this._fetchStatus(), 5000)
  }

  disconnect() {
    if (this._pollInterval) clearInterval(this._pollInterval)
  }

  async _fetchStatus() {
    try {
      const res = await fetch(this.statusUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      const data = await res.json()
      this._renderChecklist(data.items)
      this._renderSummary(data.summary)
      this.systemPassed = data.items.every(i => i.passed)
      this.isReopened = data.is_reopened || false
      this._updateReopenState(data)
      this.updateCloseButton()
    } catch (e) {
      // silently fail, try again next poll
    }
  }

  _updateReopenState(data) {
    // Yellow banner when in reopened mode
    if (this.hasReopenBannerTarget) {
      if (this.isReopened && data.forwarded_month_label) {
        this.reopenBannerTarget.classList.remove("hidden")
        this.reopenBannerTextTarget.innerHTML =
          `You are editing <strong>${this._esc(data.month_label)}</strong>. When you soft-close, you will return to <strong>${this._esc(data.forwarded_month_label)}</strong>.`
      } else {
        this.reopenBannerTarget.classList.add("hidden")
      }
    }

    // Update close button label
    if (this.hasCloseButtonTarget) {
      if (this.isReopened) {
        this.closeButtonTarget.innerHTML = `<svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Re-close ${this._esc(data.month_label)}`
      }
    }

    // Update checkbox labels when reopened
    if (this.isReopened && data.forwarded_month_label) {
      const reviewLabel = this.reviewedTotalsTarget.closest("label")
      if (reviewLabel) {
        reviewLabel.querySelector("span").innerHTML = `I have reviewed the totals shown below for <strong>${this._esc(data.month_label)}</strong>.`
      }
      const confirmLabel = this.finalConfirmationTarget.closest("label")
      if (confirmLabel) {
        confirmLabel.querySelector("span").innerHTML = `Yes, re-lock <strong>${this._esc(data.month_label)}</strong> and return to <strong>${this._esc(data.forwarded_month_label)}</strong>.`
      }
    }

    // Show/hide reopen section
    if (this.hasReopenSectionTarget) {
      if (!this.isReopened && data.has_prior_close) {
        this.reopenSectionTarget.classList.remove("hidden")
      } else {
        this.reopenSectionTarget.classList.add("hidden")
      }
    }
  }

  _renderChecklist(items) {
    let html = ""
    for (const item of items) {
      const icon = item.passed
        ? `<svg class="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`
        : `<svg class="h-5 w-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`

      let detailHtml = ""
      if (item.detail && !item.passed) {
        detailHtml = `<span class="text-xs text-red-400 dark:text-red-500 ml-1">\u2014 ${this._esc(item.detail)}</span>`
      } else if (item.detail && item.passed) {
        detailHtml = `<span class="text-xs text-gray-400 dark:text-gray-500 ml-1">(${this._esc(item.detail)})</span>`
      }

      const textColor = item.passed
        ? "text-gray-700 dark:text-gray-300"
        : "text-red-600 dark:text-red-400 font-medium"

      if (!item.passed && item.link) {
        const arrowIcon = `<svg class="h-4 w-4 text-red-300 dark:text-red-600 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
        html += `
        <a href="${this._esc(item.link)}"
           class="flex items-center space-x-3 rounded-lg px-3 py-2 -mx-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
           role="link" tabindex="0" aria-label="Fix: ${this._esc(item.label)}">
          ${icon}
          <span class="text-sm ${textColor}">${this._esc(item.label)}${detailHtml}</span>
          ${arrowIcon}
        </a>`
      } else {
        html += `
        <div class="flex items-start space-x-3 px-3 py-2 -mx-3">
          ${icon}
          <span class="text-sm ${textColor}">${this._esc(item.label)}${detailHtml}</span>
        </div>`
      }
    }
    this.checklistBodyTarget.innerHTML = html
  }

  _renderSummary(summary) {
    const items = [
      { label: "Payments Total", value: summary.payments_total, color: "text-red-600 dark:text-red-400" },
      { label: "Deposits Total", value: summary.deposits_total, color: "text-green-600 dark:text-green-400" },
      { label: "Transfers Total", value: summary.transfers_total, color: "text-blue-600 dark:text-blue-400" },
      { label: "Beginning Balance", value: summary.beginning_balance, color: "text-gray-900 dark:text-white" },
      { label: "Ending Balance", value: summary.ending_balance, color: "text-gray-900 dark:text-white" },
      { label: "Net Change", value: summary.net_change, color: summary.net_change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" }
    ]

    let html = ""
    for (const item of items) {
      html += `
        <div class="flex flex-col">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${item.label}</span>
          <span class="text-lg font-semibold ${item.color}">${this._currency(item.value)}</span>
        </div>`
    }
    this.summaryBodyTarget.innerHTML = html
  }

  updateCloseButton() {
    const reviewed = this.reviewedTotalsTarget.checked
    const confirmed = this.finalConfirmationTarget.checked
    this.closeButtonTarget.disabled = !(reviewed && confirmed && this.systemPassed)
  }

  async closeMonth() {
    this.closeButtonTarget.disabled = true
    const label = this.isReopened ? "Re-closing..." : "Closing..."
    this.closeButtonTarget.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>${label}`
    this._hideError()

    try {
      const res = await fetch(this.confirmUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({
          user_items: {
            reviewed_totals: true,
            final_confirmation: true
          }
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        if (this._pollInterval) clearInterval(this._pollInterval)
        const verb = this.isReopened ? "re-closed" : "closed"
        this.successBoxTarget.textContent = `Month ${verb} successfully! Now viewing ${data.new_month_label}. Redirecting to dashboard...`
        this.successBoxTarget.classList.remove("hidden")
        setTimeout(() => { window.location.href = this.dashboardUrlValue }, 2000)
      } else {
        this._showError(data.error || "Failed to close month.")
        this._resetCloseButton()
      }
    } catch (e) {
      this._showError("Network error. Please try again.")
      this._resetCloseButton()
    }
  }

  async reopenMonth() {
    // First confirmation
    const priorLabel = this._getPriorMonthLabel()
    if (!confirm(`Re-open ${priorLabel}?\n\nThis will allow you to edit ${priorLabel} transactions. You will need to soft-close it again when done.`)) {
      return
    }

    this.reopenButtonTarget.disabled = true
    this.reopenButtonLabelTarget.textContent = "Re-opening..."

    try {
      // Pass 1: no force
      const res = await fetch(this.reopenUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({})
      })

      const data = await res.json()

      if (data.warning) {
        // Show warning modal about current month having data
        const msg = `${data.reopened_month_label || "The current month"} has ${data.transaction_count} transaction(s).\n\nReopening will temporarily affect calculations until you re-close. Your data is safe \u2014 only the starting balance will be corrected on re-close.\n\nContinue?`
        if (!confirm(msg)) {
          this.reopenButtonTarget.disabled = false
          this.reopenButtonLabelTarget.textContent = "Re-open Prior Month"
          return
        }

        // Pass 2: with force
        const res2 = await fetch(this.reopenUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify({ force: true })
        })

        const data2 = await res2.json()
        if (data2.success) {
          window.location.reload()
          return
        } else {
          this._showError(data2.message || data2.error || "Failed to reopen month.")
          this.reopenButtonTarget.disabled = false
          this.reopenButtonLabelTarget.textContent = "Re-open Prior Month"
        }
      } else if (data.success) {
        window.location.reload()
      } else if (data.error) {
        this._showError(data.message || data.error)
        this.reopenButtonTarget.disabled = false
        this.reopenButtonLabelTarget.textContent = "Re-open Prior Month"
      }
    } catch (e) {
      this._showError("Network error. Please try again.")
      this.reopenButtonTarget.disabled = false
      this.reopenButtonLabelTarget.textContent = "Re-open Prior Month"
    }
  }

  _getPriorMonthLabel() {
    // Derive from the current status data
    const monthLabel = this.monthLabelValue
    // Parse "March 2026" to get prior month
    const parts = monthLabel.split(" ")
    if (parts.length === 2) {
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
      const idx = months.indexOf(parts[0])
      const year = parseInt(parts[1])
      if (idx >= 0) {
        const prevIdx = idx === 0 ? 11 : idx - 1
        const prevYear = idx === 0 ? year - 1 : year
        return `${months[prevIdx]} ${prevYear}`
      }
    }
    return "the prior month"
  }

  _resetCloseButton() {
    this.closeButtonTarget.disabled = false
    const label = this.isReopened ? "Re-close Month" : "Close Month"
    this.closeButtonTarget.innerHTML = `<svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>${label}`
  }

  _showError(message) {
    this.errorBoxTarget.textContent = message
    this.errorBoxTarget.classList.remove("hidden")
  }

  _hideError() {
    this.errorBoxTarget.classList.add("hidden")
  }

  _currency(val) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0)
  }

  _esc(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
