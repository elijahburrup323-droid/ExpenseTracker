import { Controller } from "@hotwired/stimulus"

/**
 * Chart Tooltip Controller
 *
 * Provides interactive tooltips for SVG chart data points.
 * Shows month label + formatted currency on hover (desktop) and tap (touch/iPad).
 * Click pins the tooltip; clicking elsewhere or another point dismisses it.
 *
 * Targets:
 *   - tooltip: the tooltip div element
 *   - chart: the SVG container div (for positioning)
 */
export default class extends Controller {
  static targets = ["tooltip", "chart"]

  connect() {
    this._pinned = false
    this._boundDismiss = this._handleDismiss.bind(this)
    document.addEventListener("pointerdown", this._boundDismiss, true)
  }

  disconnect() {
    document.removeEventListener("pointerdown", this._boundDismiss, true)
  }

  show(event) {
    const circle = event.currentTarget
    const month = circle.dataset.month
    const amount = parseFloat(circle.dataset.amount)
    if (!month) return

    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD"
    }).format(amount)

    this.tooltipTarget.innerHTML =
      `<div class="font-medium">${this._esc(month)}</div>` +
      `<div class="text-purple-600 dark:text-purple-400">${formatted}</div>`

    // Position tooltip relative to the chart container
    const chartRect = this.chartTarget.getBoundingClientRect()
    const circleRect = circle.getBoundingClientRect()

    const tipEl = this.tooltipTarget
    tipEl.classList.remove("hidden")

    // Calculate center-x of circle relative to chart
    const cx = circleRect.left + circleRect.width / 2 - chartRect.left
    const cy = circleRect.top - chartRect.top

    // Measure tooltip
    const tipW = tipEl.offsetWidth
    const tipH = tipEl.offsetHeight

    // Default: center above the point
    let left = cx - tipW / 2
    let top = cy - tipH - 8

    // Clamp horizontally within chart
    if (left < 4) left = 4
    if (left + tipW > chartRect.width - 4) left = chartRect.width - tipW - 4

    // If tooltip would go above the container, show below instead
    if (top < 0) top = cy + circleRect.height + 4

    tipEl.style.left = `${left}px`
    tipEl.style.top = `${top}px`

    this._pinned = true
  }

  _handleDismiss(event) {
    if (!this._pinned) return
    // If clicking on a data point, show() will handle it
    if (event.target.closest("[data-action*='chart-tooltip#show']")) return
    // If clicking inside tooltip, ignore
    if (this.tooltipTarget.contains(event.target)) return

    this.tooltipTarget.classList.add("hidden")
    this._pinned = false
  }

  _esc(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
