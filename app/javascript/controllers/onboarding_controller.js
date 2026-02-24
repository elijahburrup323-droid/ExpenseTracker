import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["personaInput", "personaCard"]

  selectPersona(event) {
    const card = event.currentTarget
    const persona = card.dataset.persona

    // Update hidden input
    if (this.hasPersonaInputTarget) {
      this.personaInputTarget.value = persona
    }

    // Update visual selection
    this.personaCardTargets.forEach(c => {
      c.classList.remove("ring-2", "ring-brand-500", "border-brand-500")
      c.classList.add("border-gray-200", "dark:border-gray-700")
      const check = c.querySelector("[data-check]")
      if (check) check.classList.add("hidden")
    })
    card.classList.add("ring-2", "ring-brand-500", "border-brand-500")
    card.classList.remove("border-gray-200", "dark:border-gray-700")
    const check = card.querySelector("[data-check]")
    if (check) check.classList.remove("hidden")
  }
}
