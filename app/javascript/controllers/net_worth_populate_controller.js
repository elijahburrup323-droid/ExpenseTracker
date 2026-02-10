import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["months", "status"]
  static values = { url: String }

  async populate() {
    const months = this.monthsTarget.value
    this.statusTarget.textContent = "Populating..."

    try {
      const response = await fetch(this.urlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content
        },
        body: JSON.stringify({ months_back: months })
      })

      if (response.ok) {
        const data = await response.json()
        this.statusTarget.textContent = data.message
        setTimeout(() => location.reload(), 1000)
      } else {
        this.statusTarget.textContent = "Error populating data"
      }
    } catch (e) {
      this.statusTarget.textContent = "Network error"
    }
  }
}
