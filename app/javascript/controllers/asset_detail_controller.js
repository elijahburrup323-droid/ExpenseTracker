import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tabBtn", "tabPanel",
    "overviewContent", "valuationContent", "notesContent",
    "editSection", "viewSection",
    "editName", "editType", "editPurchaseDate", "editPurchasePrice",
    "editCurrentValue", "editNetWorth", "editError",
    "valTableBody", "valError", "valChart",
    "notesArea", "notesSaveBtn", "notesStatus",
    "gainLoss"
  ]

  static values = {
    assetId: Number,
    apiUrl: String,
    typesUrl: String,
    valuationsUrl: String,
    csrfToken: String,
    listUrl: String
  }

  connect() {
    this.asset = null
    this.assetTypes = []
    this.valuations = []
    this.activeTab = "overview"
    this.editing = false
    this.fetchData()
  }

  // ─── Data Loading ──────────────────────────────────────
  async fetchData() {
    try {
      const [assetRes, typesRes] = await Promise.all([
        fetch(`${this.apiUrlValue}/${this.assetIdValue}`, { credentials: "same-origin" }),
        fetch(this.typesUrlValue, { credentials: "same-origin" })
      ])
      if (!assetRes.ok) { window.location.href = this.listUrlValue; return }
      this.asset = await assetRes.json()
      this.assetTypes = await typesRes.json()
      this.renderOverview()
      this.renderHeader()
    } catch (e) {
      console.error("Failed to load asset", e)
    }
  }

  // ─── Tab Navigation ────────────────────────────────────
  switchTab(event) {
    const tab = event.currentTarget.dataset.tab
    if (tab === this.activeTab) return
    this.activeTab = tab

    this.tabBtnTargets.forEach(btn => {
      const isActive = btn.dataset.tab === tab
      btn.classList.toggle("border-brand-600", isActive)
      btn.classList.toggle("text-brand-600", isActive)
      btn.classList.toggle("dark:border-brand-400", isActive)
      btn.classList.toggle("dark:text-brand-400", isActive)
      btn.classList.toggle("border-transparent", !isActive)
      btn.classList.toggle("text-gray-500", !isActive)
      btn.classList.toggle("dark:text-gray-400", !isActive)
    })

    this.tabPanelTargets.forEach(panel => {
      panel.classList.toggle("hidden", panel.dataset.tab !== tab)
    })

    if (tab === "valuations" && this.valuations.length === 0) {
      this.fetchValuations()
    }
  }

  // ─── Header Rendering ─────────────────────────────────
  renderHeader() {
    const a = this.asset
    const nameEl = this.element.querySelector("[data-role='asset-name']")
    const typeEl = this.element.querySelector("[data-role='asset-type']")
    if (nameEl) nameEl.textContent = a.name
    if (typeEl) typeEl.textContent = a.asset_type_name || ""
  }

  // ─── Overview Tab ──────────────────────────────────────
  renderOverview() {
    const a = this.asset
    const pp = a.purchase_price != null ? this._fmt(a.purchase_price) : "—"
    const cv = this._fmt(a.current_value)
    const pd = a.purchase_date || "—"
    const nw = a.include_in_net_worth

    // Gain/Loss calculation
    let gainLossHtml = "—"
    if (a.purchase_price != null && a.purchase_price > 0) {
      const gain = parseFloat(a.current_value) - parseFloat(a.purchase_price)
      const color = gain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      const sign = gain >= 0 ? "+" : ""
      gainLossHtml = `<span class="${color} font-semibold">${sign}${this._fmt(gain)}</span>`
    }

    this.overviewContentTarget.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Purchase Date</p>
            <p class="text-base font-medium text-gray-900 dark:text-white">${escapeHtml(pd)}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Include in Net Worth</p>
            <p class="text-base font-medium text-gray-900 dark:text-white">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${nw ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}">${nw ? 'Yes' : 'No'}</span>
            </p>
          </div>
        </div>
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Purchase Price</p>
            <p class="text-base font-medium text-gray-900 dark:text-white text-right tabular-nums">${pp}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Current Value</p>
            <p class="text-lg font-bold text-green-600 dark:text-green-400 text-right tabular-nums">${cv}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Gain / Loss</p>
            <p class="text-base text-right tabular-nums">${gainLossHtml}</p>
          </div>
        </div>
      </div>`
  }

  // ─── Edit Asset ────────────────────────────────────────
  startEdit() {
    if (this.editing) return
    this.editing = true
    const a = this.asset

    this.editNameTarget.value = a.name || ""
    this._rebuildTypeDropdown()
    this.editTypeTarget.value = String(a.asset_type_id || "")
    this.editPurchaseDateTarget.value = a.purchase_date || ""
    this.editPurchasePriceTarget.value = a.purchase_price != null ? a.purchase_price : ""
    this.editCurrentValueTarget.value = a.current_value != null ? a.current_value : ""
    this.editNetWorthTarget.innerHTML = this._renderToggle(a.include_in_net_worth)
    this.editErrorTarget.classList.add("hidden")

    this.viewSectionTarget.classList.add("hidden")
    this.editSectionTarget.classList.remove("hidden")
    setTimeout(() => this.editNameTarget.focus(), 50)
  }

  cancelEdit() {
    this.editing = false
    this.editSectionTarget.classList.add("hidden")
    this.viewSectionTarget.classList.remove("hidden")
  }

  async saveEdit() {
    const name = this.editNameTarget.value.trim()
    const asset_type_id = this.editTypeTarget.value
    const current_value = this.editCurrentValueTarget.value.trim()
    const purchase_price = this.editPurchasePriceTarget.value.trim()
    const purchase_date = this.editPurchaseDateTarget.value || null
    const toggle = this.editNetWorthTarget.querySelector(".nw-toggle")
    const include_in_net_worth = toggle?.dataset.checked === "true"

    if (!name) { this._showEditError("Asset Name is required"); return }
    if (!asset_type_id) { this._showEditError("Type is required"); return }
    if (!current_value || parseFloat(current_value) < 0) { this._showEditError("Current Value must be >= 0"); return }
    if (purchase_price && parseFloat(purchase_price) < 0) { this._showEditError("Purchase Price must be >= 0"); return }

    const body = {
      asset: {
        name,
        asset_type_id: Number(asset_type_id),
        current_value: parseFloat(current_value),
        purchase_price: purchase_price ? parseFloat(purchase_price) : null,
        purchase_date,
        include_in_net_worth
      }
    }

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.assetIdValue}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        this.asset = await res.json()
        this.cancelEdit()
        this.renderOverview()
        this.renderHeader()
      } else {
        const err = await res.json().catch(() => ({}))
        this._showEditError(err.errors ? err.errors.join(", ") : "Save failed")
      }
    } catch (e) {
      this._showEditError("Network error")
    }
  }

  _showEditError(msg) {
    this.editErrorTarget.textContent = msg
    this.editErrorTarget.classList.remove("hidden")
  }

  _rebuildTypeDropdown() {
    const dd = this.editTypeTarget
    dd.innerHTML = `<option value="">Select type...</option>`
    for (const t of this.assetTypes) {
      dd.innerHTML += `<option value="${t.id}">${escapeHtml(t.name)}</option>`
    }
  }

  // ─── Net Worth Toggle (edit mode) ─────────────────────
  _renderToggle(isOn) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
    const translate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="nw-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg}"
      data-checked="${isOn}"
      data-action="click->asset-detail#toggleEditNetWorth"
      role="switch" aria-checked="${isOn}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${translate}"></span>
    </button>`
  }

  toggleEditNetWorth(event) {
    const btn = event.currentTarget
    const wasOn = btn.dataset.checked === "true"
    const nowOn = !wasOn
    btn.dataset.checked = String(nowOn)
    btn.setAttribute("aria-checked", String(nowOn))
    btn.classList.toggle("bg-brand-600", nowOn)
    btn.classList.toggle("bg-gray-300", !nowOn)
    btn.classList.toggle("dark:bg-gray-600", !nowOn)
    const knob = btn.querySelector("span")
    knob.classList.toggle("translate-x-7", nowOn)
    knob.classList.toggle("translate-x-1", !nowOn)
  }

  // ─── Valuation History Tab ─────────────────────────────
  async fetchValuations() {
    try {
      this.valTableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400">Loading...</td></tr>`
      const res = await fetch(this.valuationsUrlValue, { credentials: "same-origin" })
      if (res.ok) {
        this.valuations = await res.json()
        this.renderValuations()
      }
    } catch (e) {
      this.valTableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-red-500">Failed to load valuations.</td></tr>`
    }
  }

  renderValuations() {
    if (this.valuations.length === 0) {
      this.valTableBodyTarget.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No valuations yet. Click <strong>Add Valuation</strong> to get started.</td></tr>`
      this.valChartTarget.innerHTML = ""
      return
    }
    this.valTableBodyTarget.innerHTML = this.valuations.map(v => this._renderValRow(v)).join("")
    this.renderValuationChart()
  }

  renderValuationChart() {
    const container = this.valChartTarget
    const sorted = [...this.valuations].sort((a, b) =>
      (a.valuation_date || "").localeCompare(b.valuation_date || "")
    )

    if (sorted.length === 0) {
      container.innerHTML = `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p class="text-center text-sm text-gray-400 dark:text-gray-500">No valuation history yet.</p>
      </div>`
      return
    }

    const isDark = document.documentElement.classList.contains("dark")
    const gridColor = isDark ? "#374151" : "#e5e7eb"
    const labelColor = isDark ? "#9ca3af" : "#6b7280"
    const axisColor = isDark ? "#4b5563" : "#d1d5db"
    const lineColor = isDark ? "#a78bfa" : "#7c3aed"
    const dotFill = isDark ? "#a78bfa" : "#7c3aed"
    const dotStroke = isDark ? "#1f2937" : "#ffffff"

    const W = 700, H = 300
    const PAD = { top: 20, right: 30, bottom: 55, left: 85 }
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom

    const values = sorted.map(v => parseFloat(v.value) || 0)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1
    const yMin = minVal - range * 0.1
    const yMax = maxVal + range * 0.1
    const yRange = yMax - yMin || 1

    const xScale = (i) => PAD.left + (sorted.length === 1 ? plotW / 2 : (i / (sorted.length - 1)) * plotW)
    const yScale = (v) => PAD.top + plotH - ((v - yMin) / yRange) * plotH

    // Grid lines (5 horizontal)
    let gridLines = ""
    let yLabels = ""
    for (let i = 0; i <= 4; i++) {
      const val = yMin + (i / 4) * yRange
      const y = yScale(val)
      gridLines += `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`
      yLabels += `<text x="${PAD.left - 8}" y="${y + 4}" text-anchor="end" fill="${labelColor}" font-size="10">${this._fmt(val)}</text>`
    }

    // Line (only if more than one point)
    let polyline = ""
    if (sorted.length > 1) {
      const points = sorted.map((v, i) => `${xScale(i)},${yScale(parseFloat(v.value) || 0)}`).join(" ")
      polyline = `<polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
    }

    // Data points with tooltips
    const dots = sorted.map((v, i) => {
      const x = xScale(i)
      const y = yScale(parseFloat(v.value) || 0)
      const dateStr = escapeHtml(v.valuation_date || "")
      return `<circle cx="${x}" cy="${y}" r="5" fill="${dotFill}" stroke="${dotStroke}" stroke-width="2"><title>${dateStr}: ${this._fmt(v.value)}</title></circle>`
    }).join("")

    // X-axis labels
    const maxLabels = Math.min(sorted.length, 12)
    const step = Math.max(1, Math.ceil(sorted.length / maxLabels))
    let xLabels = ""
    for (let i = 0; i < sorted.length; i += step) {
      const x = xScale(i)
      const dateStr = sorted[i].valuation_date || ""
      const parts = dateStr.split("-")
      const shortLabel = parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0].slice(2)}` : dateStr
      xLabels += `<text x="${x}" y="${H - PAD.bottom + 18}" text-anchor="middle" fill="${labelColor}" font-size="10" transform="rotate(-30 ${x} ${H - PAD.bottom + 18})">${escapeHtml(shortLabel)}</text>`
    }

    const axes = `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + plotH}" stroke="${axisColor}" stroke-width="1"/>
      <line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${W - PAD.right}" y2="${PAD.top + plotH}" stroke="${axisColor}" stroke-width="1"/>`

    const svg = `<svg viewBox="0 0 ${W} ${H}" class="w-full" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}${yLabels}${polyline}${dots}${xLabels}${axes}
    </svg>`

    container.innerHTML = `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Valuation Trend</h3>
      ${svg}
    </div>`
  }

  _renderValRow(v) {
    const src = v.source ? escapeHtml(v.source.charAt(0).toUpperCase() + v.source.slice(1)) : "—"
    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(v.valuation_date || "")}</td>
      <td class="px-6 py-3 text-sm text-gray-900 dark:text-white text-right tabular-nums font-semibold">${this._fmt(v.value)}</td>
      <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">${src}</td>
      <td class="px-6 py-3 text-right">
        <button type="button" data-id="${v.id}" data-action="click->asset-detail#deleteValuation"
                class="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
      </td>
    </tr>`
  }

  // ─── Add Valuation ─────────────────────────────────────
  openAddValuation() {
    // Switch to valuations tab first
    if (this.activeTab !== "valuations") {
      const btn = this.tabBtnTargets.find(b => b.dataset.tab === "valuations")
      if (btn) btn.click()
    }
    const modal = this.element.querySelector("[data-role='val-modal']")
    if (modal) {
      modal.querySelector("[data-role='val-date']").value = new Date().toISOString().split("T")[0]
      modal.querySelector("[data-role='val-value']").value = ""
      modal.querySelector("[data-role='val-source']").value = "manual"
      modal.querySelector("[data-role='val-notes']").value = ""
      this.valErrorTarget.classList.add("hidden")
      modal.classList.remove("hidden")
    }
  }

  cancelValuation() {
    const modal = this.element.querySelector("[data-role='val-modal']")
    if (modal) modal.classList.add("hidden")
  }

  async saveValuation() {
    const modal = this.element.querySelector("[data-role='val-modal']")
    const dateVal = modal.querySelector("[data-role='val-date']").value
    const valueVal = modal.querySelector("[data-role='val-value']").value.trim()
    const sourceVal = modal.querySelector("[data-role='val-source']").value
    const notesVal = modal.querySelector("[data-role='val-notes']").value.trim()

    if (!dateVal) { this._showValError("Date is required"); return }
    if (!valueVal || parseFloat(valueVal) < 0) { this._showValError("Value must be >= 0"); return }

    try {
      const res = await fetch(this.valuationsUrlValue, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({
          asset_valuation: {
            valuation_date: dateVal,
            value: parseFloat(valueVal),
            source: sourceVal,
            notes: notesVal || null
          }
        })
      })
      if (res.ok || res.status === 201) {
        const created = await res.json()
        // Insert in reverse chronological order
        this.valuations.unshift(created)
        this.valuations.sort((a, b) => (b.valuation_date || "").localeCompare(a.valuation_date || ""))
        this.renderValuations()
        this.cancelValuation()
        // Refresh asset to get updated current_value
        await this._refreshAsset()
      } else {
        const err = await res.json().catch(() => ({}))
        this._showValError(err.errors ? err.errors.join(", ") : "Save failed")
      }
    } catch (e) {
      this._showValError("Network error")
    }
  }

  async deleteValuation(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (!confirm("Delete this valuation?")) return

    try {
      const res = await fetch(`${this.valuationsUrlValue}/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (res.ok || res.status === 204) {
        this.valuations = this.valuations.filter(v => v.id !== id)
        this.renderValuations()
        await this._refreshAsset()
      }
    } catch (e) { /* silent */ }
  }

  _showValError(msg) {
    this.valErrorTarget.textContent = msg
    this.valErrorTarget.classList.remove("hidden")
  }

  // ─── Notes Tab ─────────────────────────────────────────
  notesChanged() {
    this.notesSaveBtnTarget.disabled = false
    this.notesSaveBtnTarget.classList.remove("opacity-50")
    this.notesStatusTarget.textContent = ""
  }

  async saveNotes() {
    const notes = this.notesAreaTarget.value.trim() || null
    this.notesSaveBtnTarget.disabled = true
    this.notesSaveBtnTarget.classList.add("opacity-50")
    this.notesStatusTarget.textContent = "Saving..."

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.assetIdValue}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ asset: { notes } })
      })
      if (res.ok) {
        this.asset = await res.json()
        this.notesStatusTarget.textContent = "Saved"
        setTimeout(() => { this.notesStatusTarget.textContent = "" }, 2000)
      } else {
        this.notesStatusTarget.textContent = "Save failed"
        this.notesSaveBtnTarget.disabled = false
        this.notesSaveBtnTarget.classList.remove("opacity-50")
      }
    } catch (e) {
      this.notesStatusTarget.textContent = "Network error"
      this.notesSaveBtnTarget.disabled = false
      this.notesSaveBtnTarget.classList.remove("opacity-50")
    }
  }

  // ─── Helpers ───────────────────────────────────────────
  async _refreshAsset() {
    try {
      const res = await fetch(`${this.apiUrlValue}/${this.assetIdValue}`, { credentials: "same-origin" })
      if (res.ok) {
        this.asset = await res.json()
        this.renderOverview()
        this.renderHeader()
      }
    } catch (e) { /* silent */ }
  }

  _fmt(val) {
    const num = parseFloat(val || 0)
    return num.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }
}
