import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"
import { renderIconSvg } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = ["cardsGrid", "cardWrapper"]
  static values = { reorderUrl: String }

  connect() {
    this._hydrateIcons()
    this._initSortable()
  }

  disconnect() {
    if (this.sortable) {
      this.sortable.destroy()
      this.sortable = null
    }
  }

  _hydrateIcons() {
    this.element.querySelectorAll("[data-icon-key]").forEach(el => {
      const key = el.dataset.iconKey
      if (key) {
        el.innerHTML = renderIconSvg(key, "blue", "h-5 w-5")
      }
    })
  }

  _initSortable() {
    if (!this.hasCardsGridTarget) return

    this.sortable = Sortable.create(this.cardsGridTarget, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "opacity-30",
      onEnd: () => this._onSortEnd(),
    })
  }

  async _onSortEnd() {
    const wrappers = Array.from(this.cardsGridTarget.children)
    const assignments = wrappers.map((el, idx) => ({
      slot_number: idx + 1,
      report_key: el.dataset.reportKey,
    }))

    // Update data-slot-number attributes to match new positions
    wrappers.forEach((el, idx) => {
      el.dataset.slotNumber = idx + 1
    })

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    try {
      await fetch(this.reorderUrlValue, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ slots: assignments }),
      })
    } catch (e) {
      window.location.reload()
    }
  }
}
