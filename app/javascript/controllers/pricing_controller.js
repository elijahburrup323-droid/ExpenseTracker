import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "monthlyToggle", "annualToggle",
    "freePrice", "paidPrice", "advancedPrice",
    "paidSavings", "advancedSavings",
    "paidMonthlyLabel", "advancedMonthlyLabel"
  ]

  connect() {
    this.billing = "monthly"
    this._updateUI()
  }

  switchToMonthly() {
    this.billing = "monthly"
    this._updateUI()
  }

  switchToAnnual() {
    this.billing = "annual"
    this._updateUI()
  }

  _updateUI() {
    const isAnnual = this.billing === "annual"

    // Toggle button styles
    this.monthlyToggleTarget.className = isAnnual
      ? "px-4 py-2 text-sm font-medium rounded-lg transition text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      : "px-4 py-2 text-sm font-medium rounded-lg transition bg-brand-600 text-white shadow-sm"

    this.annualToggleTarget.className = isAnnual
      ? "px-4 py-2 text-sm font-medium rounded-lg transition bg-brand-600 text-white shadow-sm"
      : "px-4 py-2 text-sm font-medium rounded-lg transition text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"

    // Free tier — always free
    this.freePriceTarget.innerHTML = `<span class="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span><span class="text-base font-medium text-gray-500 dark:text-gray-400">/mo</span>`

    // Paid tier
    if (isAnnual) {
      this.paidPriceTarget.innerHTML = `<span class="text-4xl font-extrabold text-gray-900 dark:text-white">$2.08</span><span class="text-base font-medium text-gray-500 dark:text-gray-400">/mo</span>`
      this.paidSavingsTarget.classList.remove("hidden")
      this.paidSavingsTarget.textContent = "Billed $25/year — Save $22.88"
      this.paidMonthlyLabelTarget.classList.add("hidden")
    } else {
      this.paidPriceTarget.innerHTML = `<span class="text-4xl font-extrabold text-gray-900 dark:text-white">$3.99</span><span class="text-base font-medium text-gray-500 dark:text-gray-400">/mo</span>`
      this.paidSavingsTarget.classList.add("hidden")
      this.paidMonthlyLabelTarget.classList.remove("hidden")
    }

    // Advanced tier
    if (isAnnual) {
      this.advancedPriceTarget.innerHTML = `<span class="text-4xl font-extrabold text-gray-900 dark:text-white">$2.92</span><span class="text-base font-medium text-gray-500 dark:text-gray-400">/mo</span>`
      this.advancedSavingsTarget.classList.remove("hidden")
      this.advancedSavingsTarget.textContent = "Billed $35/year — Save $36.88"
      this.advancedMonthlyLabelTarget.classList.add("hidden")
    } else {
      this.advancedPriceTarget.innerHTML = `<span class="text-4xl font-extrabold text-gray-900 dark:text-white">$5.99</span><span class="text-base font-medium text-gray-500 dark:text-gray-400">/mo</span>`
      this.advancedSavingsTarget.classList.add("hidden")
      this.advancedMonthlyLabelTarget.classList.remove("hidden")
    }
  }
}
