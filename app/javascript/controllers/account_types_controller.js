import { Controller } from "@hotwired/stimulus"

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default class extends Controller {
  static targets = ["tableBody"]
  static values = { apiUrl: String, csrfToken: String }

  connect() {
    this.types = []
    this.fetchAll()
  }

  async fetchAll() {
    try {
      const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (!res.ok) return
      this.types = await res.json()
      this.renderTable()
    } catch (e) {
      console.error("Failed to load account types:", e)
    }
  }

  renderTable() {
    if (this.types.length === 0) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No account types available.</td></tr>`
      return
    }

    this.tableBodyTarget.innerHTML = this.types.map(t => {
      const toggle = t.is_enabled
        ? `<button class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-brand-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2" data-id="${t.account_type_master_id}" data-action="click->account-types#toggle"><span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5"></span></button>`
        : `<button class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 dark:bg-gray-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2" data-id="${t.account_type_master_id}" data-action="click->account-types#toggle"><span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0"></span></button>`

      return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(t.display_name)}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(t.description || "")}</td>
        <td class="px-6 py-4 text-center">${toggle}</td>
      </tr>`
    }).join("")
  }

  async toggle(event) {
    const masterId = parseInt(event.currentTarget.dataset.id)
    const type = this.types.find(t => t.account_type_master_id === masterId)
    if (!type) return

    try {
      const res = await fetch(`${this.apiUrlValue}/${masterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ user_account_type: { is_enabled: !type.is_enabled } })
      })
      if (res.ok) this.fetchAll()
    } catch (e) {
      console.error("Toggle failed:", e)
    }
  }
}
