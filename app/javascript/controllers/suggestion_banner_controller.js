import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["banner"]
  static values = { dismissUrl: String, csrfToken: String }

  async dismiss() {
    // Hide banner immediately
    if (this.hasBannerTarget) {
      this.bannerTarget.style.transition = "opacity 300ms, max-height 300ms"
      this.bannerTarget.style.opacity = "0"
      this.bannerTarget.style.maxHeight = "0"
      this.bannerTarget.style.overflow = "hidden"
      this.bannerTarget.style.marginBottom = "0"
      this.bannerTarget.style.padding = "0"
      setTimeout(() => this.bannerTarget.remove(), 300)
    }

    // Notify server
    if (this.dismissUrlValue) {
      try {
        await fetch(this.dismissUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          }
        })
      } catch (e) {
        // Silently fail
      }
    }
  }
}
