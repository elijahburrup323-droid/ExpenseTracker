import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toc", "content"]

  connect() {
    this._buildToc()
    this._setupScrollSpy()
  }

  disconnect() {
    if (this._observer) this._observer.disconnect()
  }

  scrollTo(e) {
    e.preventDefault()
    const id = e.currentTarget.getAttribute("href").slice(1)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      // Update active state immediately
      this._setActive(id)
    }
  }

  _buildToc() {
    const sections = this.contentTarget.querySelectorAll("[data-section]")
    if (sections.length === 0) return

    let html = ""
    sections.forEach(section => {
      const id = section.id
      const title = section.getAttribute("data-section")
      const isSubsection = section.tagName === "H3"
      html += `<a href="#${id}" data-action="click->legal-toc#scrollTo"
                  class="legal-toc-link block py-1.5 text-sm border-l-2 transition-colors duration-150
                         ${isSubsection ? 'pl-6 text-xs' : 'pl-4'}
                         border-transparent text-gray-500 dark:text-gray-400
                         hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300"
                  data-toc-id="${id}">${title}</a>`
    })
    this.tocTarget.innerHTML = html
  }

  _setupScrollSpy() {
    const sections = this.contentTarget.querySelectorAll("[data-section]")
    if (sections.length === 0) return

    this._observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this._setActive(entry.target.id)
        }
      })
    }, { rootMargin: "-80px 0px -60% 0px", threshold: 0 })

    sections.forEach(s => this._observer.observe(s))
  }

  _setActive(id) {
    this.tocTarget.querySelectorAll(".legal-toc-link").forEach(link => {
      if (link.getAttribute("data-toc-id") === id) {
        link.classList.remove("border-transparent", "text-gray-500", "dark:text-gray-400")
        link.classList.add("border-brand-600", "text-brand-600", "dark:text-brand-400", "font-medium")
      } else {
        link.classList.remove("border-brand-600", "text-brand-600", "dark:text-brand-400", "font-medium")
        link.classList.add("border-transparent", "text-gray-500", "dark:text-gray-400")
      }
    })
  }
}
