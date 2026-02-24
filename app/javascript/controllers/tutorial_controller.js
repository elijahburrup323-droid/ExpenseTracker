import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    steps: Array,
    apiUrl: String,
    csrfToken: String,
    blockKey: String
  }

  connect() {
    this.currentStep = 0
    this.overlay = null
    this.popover = null
    this.spotlitElement = null

    if (this.stepsValue && this.stepsValue.length > 0) {
      setTimeout(() => this.start(), 800)
    }
  }

  disconnect() {
    this.cleanup()
  }

  start() {
    this.createOverlay()
    this.showStep(0)
  }

  createOverlay() {
    this.overlay = document.createElement("div")
    this.overlay.className = "fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300 cursor-pointer"
    this.overlay.style.opacity = "0"
    this.overlay.addEventListener("click", () => this.skip())
    this.element.appendChild(this.overlay)
    requestAnimationFrame(() => { this.overlay.style.opacity = "1" })
  }

  showStep(index) {
    this.currentStep = index
    const step = this.stepsValue[index]
    if (!step) return this.complete()

    // Remove previous spotlight
    if (this.spotlitElement) {
      this.spotlitElement.classList.remove("tutorial-spotlight")
      this.spotlitElement.style.position = ""
      this.spotlitElement.style.zIndex = ""
    }

    // Find and spotlight target element
    const target = document.querySelector(step.selector)
    if (target) {
      target.classList.add("tutorial-spotlight")
      target.style.position = "relative"
      target.style.zIndex = "9999"
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      this.spotlitElement = target
    }

    // Remove existing popover
    if (this.popover) this.popover.remove()

    // Create popover
    this.popover = document.createElement("div")
    this.popover.className = "fixed z-[10000] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 max-w-sm w-80"
    this.popover.innerHTML = `
      <div class="flex items-center space-x-1.5 mb-3">
        ${this.stepsValue.map((_, i) => `
          <div class="h-1.5 w-6 rounded-full ${i === index ? 'bg-brand-600' : i < index ? 'bg-brand-300' : 'bg-gray-200 dark:bg-gray-600'}"></div>
        `).join("")}
      </div>
      <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">${this._esc(step.title)}</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">${this._esc(step.body)}</p>
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-400">Step ${index + 1} of ${this.stepsValue.length}</span>
        <div class="flex items-center space-x-2">
          <button type="button" data-action="click->tutorial#skip" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">Skip</button>
          ${index > 0 ? `<button type="button" data-action="click->tutorial#back" class="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">Back</button>` : ""}
          <button type="button" data-action="click->tutorial#next" class="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition">${index === this.stepsValue.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </div>
    `
    this.element.appendChild(this.popover)

    // Position the popover
    if (target) {
      this._positionPopover(target, step.position || "bottom")
    } else {
      // Center on screen if no target found
      this.popover.style.top = "50%"
      this.popover.style.left = "50%"
      this.popover.style.transform = "translate(-50%, -50%)"
    }

    this.saveProgress("in_progress")
  }

  _positionPopover(target, position) {
    const rect = target.getBoundingClientRect()
    const pop = this.popover.getBoundingClientRect()
    const gap = 12
    let top, left

    switch (position) {
      case "top":
        top = rect.top - pop.height - gap
        left = rect.left + (rect.width / 2) - (pop.width / 2)
        break
      case "left":
        top = rect.top + (rect.height / 2) - (pop.height / 2)
        left = rect.left - pop.width - gap
        break
      case "right":
        top = rect.top + (rect.height / 2) - (pop.height / 2)
        left = rect.right + gap
        break
      default: // bottom
        top = rect.bottom + gap
        left = rect.left + (rect.width / 2) - (pop.width / 2)
    }

    // Keep within viewport
    top = Math.max(8, Math.min(top, window.innerHeight - pop.height - 8))
    left = Math.max(8, Math.min(left, window.innerWidth - pop.width - 8))

    this.popover.style.top = `${top}px`
    this.popover.style.left = `${left}px`
  }

  next() {
    if (this.currentStep >= this.stepsValue.length - 1) {
      this.complete()
    } else {
      this.showStep(this.currentStep + 1)
    }
  }

  back() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1)
    }
  }

  skip() {
    this.saveProgress("skipped")
    this.cleanup()
  }

  complete() {
    this.saveProgress("completed")
    this.cleanup()

    // Show completion toast (append to body since controller overlay is cleaned up)
    const toast = document.createElement("div")
    toast.className = "fixed bottom-4 right-4 z-[10001] bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity duration-300"
    toast.textContent = "Tutorial complete!"
    document.body.appendChild(toast)
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300) }, 3000)
  }

  cleanup() {
    if (this.spotlitElement) {
      this.spotlitElement.classList.remove("tutorial-spotlight")
      this.spotlitElement.style.position = ""
      this.spotlitElement.style.zIndex = ""
      this.spotlitElement = null
    }
    if (this.popover) { this.popover.remove(); this.popover = null }
    if (this.overlay) { this.overlay.remove(); this.overlay = null }
  }

  async saveProgress(status) {
    if (!this.apiUrlValue) return
    try {
      await fetch(this.apiUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({
          block_key: this.blockKeyValue,
          current_step: this.currentStep + 1,
          total_steps: this.stepsValue.length,
          status: status
        })
      })
    } catch (e) {
      // Silently fail — tutorial progress is non-critical
    }
  }

  _esc(str) {
    const div = document.createElement("div")
    div.textContent = str || ""
    return div.innerHTML
  }
}
