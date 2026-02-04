import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input"]

  connect() {
    this.inputTarget.addEventListener("input", this.handleInput.bind(this))
    this.inputTarget.addEventListener("paste", this.handlePaste.bind(this))
  }

  handleInput(event) {
    const value = event.target.value.replace(/\D/g, "").slice(0, 6)
    event.target.value = value

    if (value.length === 6) {
      event.target.form.requestSubmit()
    }
  }

  handlePaste(event) {
    event.preventDefault()
    const paste = (event.clipboardData || window.clipboardData).getData("text")
    const digits = paste.replace(/\D/g, "").slice(0, 6)
    this.inputTarget.value = digits

    if (digits.length === 6) {
      this.inputTarget.form.requestSubmit()
    }
  }
}
