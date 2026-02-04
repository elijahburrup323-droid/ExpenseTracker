import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["message"]

  connect() {
    this.messageTargets.forEach((message, index) => {
      setTimeout(() => {
        this.fadeOut(message)
      }, 5000 + (index * 500))
    })
  }

  dismiss(event) {
    this.fadeOut(event.currentTarget)
  }

  fadeOut(element) {
    element.style.transition = "opacity 0.3s ease-out"
    element.style.opacity = "0"
    setTimeout(() => {
      element.remove()
    }, 300)
  }
}
