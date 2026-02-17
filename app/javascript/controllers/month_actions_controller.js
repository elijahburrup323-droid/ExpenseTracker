import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "softCloseModal", "softCloseMessage",
    "openSoftCloseModal", "openSoftCloseMessage",
    "resultModal", "resultTitle", "resultMessage"
  ]
  static values = { closeUrl: String, reopenUrl: String, showUrl: String, csrfToken: String }

  // --- Soft Close Month ---

  async confirmSoftClose() {
    try {
      const res = await fetch(this.showUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) {
        const msg = res.status === 401 ? "Session expired. Please sign in again."
          : `Server error (${res.status}). Please reload the page and try again.`
        this._showResult("Error", msg)
        return
      }
      const om = await res.json()
      if (!om.current_month || !om.current_year) {
        this._showResult("Error", "No open month record found. Please contact support.")
        return
      }
      const currentName = this._monthName(om.current_month, om.current_year)
      const nextMonth = om.current_month === 12 ? 1 : om.current_month + 1
      const nextYear = om.current_month === 12 ? om.current_year + 1 : om.current_year
      const nextName = this._monthName(nextMonth, nextYear)
      this.softCloseMessageTarget.textContent =
        `This will close ${currentName} and move you to ${nextName}. You can re-open it only if you have not entered any transactions in the new month.`
      this.softCloseModalTarget.classList.remove("hidden")
    } catch (e) {
      this._showResult("Error", "Failed to load month info. Please check your connection and try again.")
    }
  }

  cancelSoftClose() {
    this.softCloseModalTarget.classList.add("hidden")
  }

  async executeSoftClose() {
    this.softCloseModalTarget.classList.add("hidden")
    try {
      const res = await fetch(this.closeUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        }
      })
      const data = await res.json()
      if (res.ok) {
        const newName = this._monthName(data.current_month, data.current_year)
        this._showResult("Month Closed", `Successfully moved to ${newName}. The page will reload.`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        this._showResult("Error", data.error || data.message || "Failed to close month")
      }
    } catch (e) {
      this._showResult("Error", "Network error while closing month")
    }
  }

  // --- Open Soft Close ---

  async confirmOpenSoftClose() {
    try {
      const res = await fetch(this.showUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) {
        const msg = res.status === 401 ? "Session expired. Please sign in again."
          : `Server error (${res.status}). Please reload the page and try again.`
        this._showResult("Error", msg)
        return
      }
      const om = await res.json()
      if (!om.current_month || !om.current_year) {
        this._showResult("Error", "No open month record found. Please contact support.")
        return
      }
      this.openSoftCloseMessageTarget.textContent =
        `This will re-open the previous month. You can only do this if no transactions have been entered in the current open month (${this._monthName(om.current_month, om.current_year)}).`
      this.openSoftCloseModalTarget.classList.remove("hidden")
    } catch (e) {
      this._showResult("Error", "Failed to load month info. Please check your connection and try again.")
    }
  }

  cancelOpenSoftClose() {
    this.openSoftCloseModalTarget.classList.add("hidden")
  }

  async executeOpenSoftClose() {
    this.openSoftCloseModalTarget.classList.add("hidden")
    try {
      const res = await fetch(this.reopenUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        }
      })
      const data = await res.json()
      if (res.ok) {
        const name = this._monthName(data.current_month, data.current_year)
        this._showResult("Month Re-opened", `Successfully re-opened ${name}. The page will reload.`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        this._showResult("Cannot Re-open", data.message || data.error || "Failed to re-open month")
      }
    } catch (e) {
      this._showResult("Error", "Network error while re-opening month")
    }
  }

  // --- Result Modal ---

  _showResult(title, message) {
    this.resultTitleTarget.textContent = title
    this.resultMessageTarget.textContent = message
    this.resultModalTarget.classList.remove("hidden")
  }

  closeResult() {
    this.resultModalTarget.classList.add("hidden")
  }

  // --- Helpers ---

  _monthName(month, year) {
    const names = ["", "January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]
    return `${names[month]} ${year}`
  }
}
