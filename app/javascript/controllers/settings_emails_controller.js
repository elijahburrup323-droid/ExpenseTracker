import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["list", "addForm"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.emails = []
    this.fetchEmails()
  }

  async fetchEmails() {
    try {
      const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) this.emails = await res.json()
    } catch (e) {}
    this.render()
  }

  render() {
    let html = ""
    for (const email of this.emails) {
      html += this._renderEmailRow(email)
    }
    this.listTarget.innerHTML = html
  }

  _renderEmailRow(email) {
    const verifiedBadge = email.verified
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Verified</span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">Unverified</span>`

    const verifySection = email.verified ? "" : `
      <div class="mt-2 flex items-center gap-2" data-email-id="${email.id}">
        <input type="text" maxlength="6" placeholder="Enter 6-digit code"
               class="w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
               data-verify-input="${email.id}">
        <button type="button" class="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition"
                data-action="click->settings-emails#verifyEmail" data-email-id="${email.id}">Verify</button>
        <button type="button" class="px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline transition"
                data-action="click->settings-emails#resendCode" data-email-id="${email.id}">Resend</button>
      </div>`

    return `<div class="flex items-start justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-900 dark:text-white">${this._escapeHtml(email.email)}</span>
          ${verifiedBadge}
        </div>
        ${verifySection}
      </div>
      <button type="button" class="ml-3 p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition flex-shrink-0"
              data-action="click->settings-emails#removeEmail" data-email-id="${email.id}" title="Remove">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>`
  }

  showAddForm() {
    this.addFormTarget.classList.remove("hidden")
    const input = this.addFormTarget.querySelector("input[type='email']")
    if (input) { input.value = ""; input.focus() }
  }

  hideAddForm() {
    this.addFormTarget.classList.add("hidden")
  }

  async addEmail(event) {
    event.preventDefault()
    const input = this.addFormTarget.querySelector("input[type='email']")
    const email = input?.value?.trim()
    if (!email) return

    try {
      const res = await fetch(this.apiUrlValue, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        const data = await res.json()
        this.emails.push(data)
        this.render()
        this.hideAddForm()
      } else {
        const data = await res.json()
        alert(data.errors?.[0] || "Failed to add email")
      }
    } catch (e) {
      alert("Network error")
    }
  }

  async verifyEmail(event) {
    const id = event.currentTarget.dataset.emailId
    const input = this.element.querySelector(`[data-verify-input="${id}"]`)
    const code = input?.value?.trim()
    if (!code) { alert("Please enter the verification code"); return }

    try {
      const res = await fetch(`${this.apiUrlValue}/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ code })
      })
      if (res.ok) {
        const idx = this.emails.findIndex(e => e.id === Number(id))
        if (idx !== -1) this.emails[idx].verified = true
        this.render()
      } else {
        const data = await res.json()
        alert(data.errors?.[0] || "Verification failed")
      }
    } catch (e) {
      alert("Network error")
    }
  }

  async resendCode(event) {
    const id = event.currentTarget.dataset.emailId
    try {
      await fetch(`${this.apiUrlValue}/${id}/resend_code`, {
        method: "POST",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      alert("Verification code resent")
    } catch (e) {
      alert("Network error")
    }
  }

  async removeEmail(event) {
    const id = event.currentTarget.dataset.emailId
    if (!confirm("Remove this email?")) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (res.ok || res.status === 204) {
        this.emails = this.emails.filter(e => e.id !== Number(id))
        this.render()
      }
    } catch (e) {
      alert("Network error")
    }
  }

  addFormKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.addEmail(event)
    } else if (event.key === "Escape") {
      this.hideAddForm()
    }
  }

  _escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
