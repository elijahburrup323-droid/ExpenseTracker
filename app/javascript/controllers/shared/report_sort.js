/**
 * Shared sortable-header utility for all reports under Monthly > Reports.
 *
 * Usage in a Stimulus controller:
 *   import { sortTh, sortData, nextSortState } from "controllers/shared/report_sort"
 *
 *   connect() { this._sort = { field: "amount", dir: "desc" } }
 *
 *   toggleSort(event) {
 *     const f = event.currentTarget.dataset.sortField
 *     if (!f) return
 *     this._sort = nextSortState(f, this._sort.field, this._sort.dir)
 *     this.render()
 *   }
 *
 *   // In render():
 *   sortTh("Amount", "amount", this._sort, this._controllerName, "right")
 */

/** Returns { field, dir } after a header click */
export function nextSortState(clickedField, currentField, currentDir) {
  if (clickedField === currentField) {
    return { field: clickedField, dir: currentDir === "asc" ? "desc" : "asc" }
  }
  return { field: clickedField, dir: "asc" }
}

/** Small chevron SVG used as sort indicator */
function chevron(dir) {
  if (dir === "asc") return `<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>`
  return `<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`
}

/**
 * Renders a sortable <th> element.
 * @param {string} label - Column header text
 * @param {string} field - Sort field key
 * @param {{ field: string, dir: string }} sort - Current sort state
 * @param {string} ctrl - Stimulus controller identifier (e.g. "spending-by-category")
 * @param {string} align - "left" | "right" | "center"
 */
export function sortTh(label, field, sort, ctrl, align = "left") {
  const active = sort.field === field
  const colorCls = active ? "text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
  const indicator = active
    ? `<span class="text-brand-600 dark:text-brand-400 ml-1">${chevron(sort.dir)}</span>`
    : `<span class="text-gray-300 dark:text-gray-600 ml-1">${chevron("asc")}</span>`
  const justifyMap = { left: "start", right: "end", center: "center" }
  const justify = justifyMap[align] || "start"
  return `<th class="px-6 py-3 text-${align} text-xs font-medium ${colorCls} uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition select-none"
      data-sort-field="${field}" data-action="click->${ctrl}#toggleSort">
    <span class="inline-flex items-center justify-${justify} space-x-0.5"><span>${label}</span>${indicator}</span>
  </th>`
}

/**
 * Sorts an array of objects by a field.
 * Handles numbers, strings, dates, and nulls.
 * @param {Array} array - Data rows
 * @param {string} field - Property name to sort by
 * @param {string} dir - "asc" | "desc"
 * @param {Function} [accessor] - Optional (row, field) => value override
 */
export function sortData(array, field, dir, accessor) {
  const sorted = [...array]
  const mult = dir === "asc" ? 1 : -1

  sorted.sort((a, b) => {
    const va = accessor ? accessor(a, field) : a[field]
    const vb = accessor ? accessor(b, field) : b[field]

    if (va == null && vb == null) return 0
    if (va == null) return 1 * mult
    if (vb == null) return -1 * mult

    const na = typeof va === "string" ? parseFloat(va) : va
    const nb = typeof vb === "string" ? parseFloat(vb) : vb

    if (typeof na === "number" && !isNaN(na) && typeof nb === "number" && !isNaN(nb)) {
      return (na - nb) * mult
    }

    return String(va).localeCompare(String(vb), undefined, { sensitivity: "base" }) * mult
  })

  return sorted
}
