import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

export default class extends Controller {
  static targets = [
    "tabBtn", "tabPanel",
    "overviewContent", "valuationContent", "notesContent",
    "editSection", "viewSection",
    "editName", "editType", "editPurchaseDate", "editPurchasePrice",
    "editCurrentValue", "editNetWorth", "editError",
    "editStandardFields", "editUnitFields", "editUnitLabel", "editPricePerUnit",
    "valTableBody", "valError", "valChart", "depreciationContent",
    "addLotBtn", "lotsTabBtn", "lotsSummary", "lotsTableBody", "lotError", "lotModalTitle",
    "notesArea", "notesSaveBtn", "notesStatus",
    "gainLoss"
  ]

  static values = {
    assetId: Number,
    apiUrl: String,
    typesUrl: String,
    valuationsUrl: String,
    lotsUrl: String,
    csrfToken: String,
    listUrl: String
  }

  connect() {
    this.asset = null
    this.assetTypes = []
    this.valuations = []
    this.lots = []
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
      this._configureUnitBasedUI()
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
    if (tab === "lots" && this.lots.length === 0) {
      this.fetchLots()
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

  // ─── Unit-Based UI Configuration ───────────────────────
  _configureUnitBasedUI() {
    const isUnitBased = this.asset.unit_based === true

    // Show/hide "Purchase Lots" tab button
    if (this.hasLotsTabBtnTarget) {
      this.lotsTabBtnTarget.classList.toggle("hidden", !isUnitBased)
    }

    // Show/hide "Add Lot" header button
    if (this.hasAddLotBtnTarget) {
      this.addLotBtnTarget.classList.toggle("hidden", !isUnitBased)
    }

    // Auto-fetch lots for unit-based assets
    if (isUnitBased && this.lots.length === 0 && this.hasLotsUrlValue) {
      this.fetchLots()
    }
  }

  // ─── Overview Tab ──────────────────────────────────────
  renderOverview() {
    if (this.asset.unit_based) {
      this._renderUnitBasedOverview()
    } else {
      this._renderStandardOverview()
    }
    this.renderDepreciation()
  }

  _renderUnitBasedOverview() {
    const a = this.asset
    const tq = a.total_quantity != null ? parseFloat(a.total_quantity) : 0
    const unitLabel = a.unit_label || "units"
    const costBasis = a.total_cost_basis != null ? this._fmt(a.total_cost_basis) : "---"
    const pricePerUnit = a.current_price_per_unit != null ? this._fmt(a.current_price_per_unit) : "---"
    const currentValue = this._fmt(a.current_value)
    const nw = a.include_in_net_worth

    let gainLossHtml = "---"
    if (a.unrealized_gain != null) {
      const gain = parseFloat(a.unrealized_gain)
      const color = gain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      const sign = gain >= 0 ? "+" : ""
      gainLossHtml = `<span class="${color} font-semibold">${sign}${this._fmt(gain)}</span>`
    }

    this.overviewContentTarget.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Holdings</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">${tq.toLocaleString("en-US", {maximumFractionDigits: 6})} ${escapeHtml(unitLabel)}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Cost Basis</p>
            <p class="text-base font-medium text-gray-900 dark:text-white tabular-nums">${costBasis}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Purchase Lots</p>
            <p class="text-base font-medium text-gray-900 dark:text-white">${a.lot_count || 0} lot${(a.lot_count || 0) === 1 ? '' : 's'}</p>
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
            <p class="text-sm text-gray-500 dark:text-gray-400">Current Price per ${escapeHtml(unitLabel)}</p>
            <p class="text-base font-medium text-gray-900 dark:text-white text-right tabular-nums">${pricePerUnit}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Current Total Value</p>
            <p class="text-lg font-bold text-green-600 dark:text-green-400 text-right tabular-nums">${currentValue}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Unrealized Gain / Loss</p>
            <p class="text-base text-right tabular-nums">${gainLossHtml}</p>
          </div>
        </div>
      </div>
      ${this._renderPriceUpdateControl(a)}`
  }

  _renderPriceUpdateControl(a) {
    const unitLabel = a.unit_label || "unit"
    return `
    <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
      <div class="flex items-end gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Update Current Price per ${escapeHtml(unitLabel)}</label>
          <input type="number" step="0.0001" min="0" data-role="price-input"
                 value="${a.current_price_per_unit || ''}"
                 class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 tabular-nums"
                 placeholder="Enter current market price">
        </div>
        <button type="button" data-action="click->asset-detail#saveCurrentPrice"
                class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition whitespace-nowrap">
          Update Price
        </button>
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1" data-role="price-status"></p>
    </div>`
  }

  async saveCurrentPrice() {
    const input = this.element.querySelector("[data-role='price-input']")
    const status = this.element.querySelector("[data-role='price-status']")
    const val = input?.value?.trim()
    if (!val || parseFloat(val) < 0) {
      if (status) { status.textContent = "Price must be >= 0"; status.className = "text-xs text-red-500 mt-1" }
      return
    }

    try {
      const res = await fetch(`${this.apiUrlValue}/${this.assetIdValue}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({ asset: { current_price_per_unit: parseFloat(val) } })
      })
      if (res.ok) {
        this.asset = await res.json()
        this.renderOverview()
        this.renderHeader()
      } else {
        if (status) { status.textContent = "Save failed"; status.className = "text-xs text-red-500 mt-1" }
      }
    } catch (e) {
      if (status) { status.textContent = "Network error"; status.className = "text-xs text-red-500 mt-1" }
    }
  }

  _renderStandardOverview() {
    const a = this.asset
    const pp = a.purchase_price != null ? this._fmt(a.purchase_price) : "---"
    const cv = this._fmt(a.current_value)
    const pd = a.purchase_date || "---"
    const nw = a.include_in_net_worth

    let gainLossHtml = "---"
    if (a.purchase_price != null && a.purchase_price > 0) {
      const gain = parseFloat(a.current_value) - parseFloat(a.purchase_price)
      const color = gain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      const sign = gain >= 0 ? "+" : ""
      gainLossHtml = `<span class="${color} font-semibold">${sign}${this._fmt(gain)}</span>`
    }

    let projectionHtml = ""
    if (a.projection_enabled && a.projected_value != null) {
      projectionHtml += `
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Projected Value (Today)</p>
            <p class="text-base font-medium text-brand-600 dark:text-brand-400 text-right tabular-nums">${this._fmt(a.projected_value)}
              <span class="text-xs text-gray-400 dark:text-gray-500 ml-1">Projected</span>
            </p>
          </div>`
    }

    let fiveYearHtml = ""
    if (a.projection_enabled && a.five_year_projection && a.five_year_projection.length > 0) {
      const items = a.five_year_projection.map(p =>
        `<span class="text-xs text-gray-600 dark:text-gray-400 tabular-nums">${p.year}: ${this._fmt(p.value)}</span>`
      ).join(" &middot; ")
      fiveYearHtml = `
      <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">5-Year Projection</p>
        <div class="flex flex-wrap gap-2">${items}</div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">Based on ${escapeHtml(a.depreciation_method === "STRAIGHT_LINE" ? "Straight Line" : "Percentage")} method. Projections are estimates only.</p>
      </div>`
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
          ${projectionHtml}
        </div>
      </div>
      ${fiveYearHtml}`
  }

  // ─── Depreciation Settings ──────────────────────────────
  renderDepreciation() {
    const a = this.asset
    const method = a.depreciation_method || "NONE"
    const rate = a.annual_rate != null ? a.annual_rate : ""
    const life = a.useful_life_years != null ? a.useful_life_years : ""
    const projOn = a.projection_enabled || false

    const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"

    this.depreciationContentTarget.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Depreciation / Appreciation Settings</h3>
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
              <select data-role="dep-method" class="${inputCls}">
                <option value="NONE" ${method === "NONE" ? "selected" : ""}>None</option>
                <option value="STRAIGHT_LINE" ${method === "STRAIGHT_LINE" ? "selected" : ""}>Straight Line</option>
                <option value="PERCENTAGE" ${method === "PERCENTAGE" ? "selected" : ""}>Percentage</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Rate (%)</label>
              <input type="number" step="0.01" min="-100" max="100" value="${escapeHtml(String(rate))}"
                     data-role="dep-rate" class="${inputCls} tabular-nums" placeholder="e.g. -10 or 5">
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Positive = appreciation, Negative = depreciation</p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Useful Life (years)</label>
              <input type="number" step="1" min="1" value="${escapeHtml(String(life))}"
                     data-role="dep-life" class="${inputCls} tabular-nums" placeholder="e.g. 10">
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Required for Straight Line method</p>
            </div>
            <div class="flex items-center justify-between pt-6">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Projections</label>
              ${this._renderDepToggle(projOn)}
            </div>
          </div>
          <p class="text-sm text-red-600 dark:text-red-400 hidden" data-role="dep-error"></p>
          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-gray-400 dark:text-gray-500">Projections are display-only and do not affect Net Worth.</p>
            <button type="button" data-action="click->asset-detail#saveDepreciation"
                    class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition">
              Save Settings
            </button>
          </div>
        </div>
      </div>`
  }

  _renderDepToggle(isOn) {
    const bg = isOn ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
    const translate = isOn ? "translate-x-7" : "translate-x-1"
    return `<button type="button"
      class="dep-toggle relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${bg}"
      data-checked="${isOn}"
      data-action="click->asset-detail#toggleDepProjection"
      role="switch" aria-checked="${isOn}">
      <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${translate}"></span>
    </button>`
  }

  toggleDepProjection(event) {
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

  async saveDepreciation() {
    const container = this.depreciationContentTarget
    const method = container.querySelector("[data-role='dep-method']").value
    const rateVal = container.querySelector("[data-role='dep-rate']").value.trim()
    const lifeVal = container.querySelector("[data-role='dep-life']").value.trim()
    const toggle = container.querySelector(".dep-toggle")
    const projEnabled = toggle?.dataset.checked === "true"
    const errEl = container.querySelector("[data-role='dep-error']")

    // Validation
    if (method === "STRAIGHT_LINE" && (!lifeVal || parseInt(lifeVal) <= 0)) {
      errEl.textContent = "Useful Life must be > 0 for Straight Line method"
      errEl.classList.remove("hidden")
      return
    }
    if (rateVal && (parseFloat(rateVal) < -100 || parseFloat(rateVal) > 100)) {
      errEl.textContent = "Annual Rate must be between -100% and +100%"
      errEl.classList.remove("hidden")
      return
    }
    errEl.classList.add("hidden")

    const body = {
      asset: {
        depreciation_method: method,
        annual_rate: rateVal ? parseFloat(rateVal) : null,
        useful_life_years: lifeVal ? parseInt(lifeVal) : null,
        projection_enabled: projEnabled
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
        this.renderOverview()
        this.renderHeader()
      } else {
        const err = await res.json().catch(() => ({}))
        errEl.textContent = err.errors ? err.errors.join(", ") : "Save failed"
        errEl.classList.remove("hidden")
      }
    } catch (e) {
      errEl.textContent = "Network error"
      errEl.classList.remove("hidden")
    }
  }

  // ─── Edit Asset ────────────────────────────────────────
  startEdit() {
    if (this.editing) return
    this.editing = true
    const a = this.asset
    const isUnitBased = a.unit_based === true

    this.editNameTarget.value = a.name || ""
    this._rebuildTypeDropdown()
    this.editTypeTarget.value = String(a.asset_type_id || "")
    this.editNetWorthTarget.innerHTML = this._renderToggle(a.include_in_net_worth)
    this.editErrorTarget.classList.add("hidden")

    // Toggle standard vs unit-based fields
    if (this.hasEditStandardFieldsTarget) {
      this.editStandardFieldsTarget.classList.toggle("hidden", isUnitBased)
    }
    if (this.hasEditUnitFieldsTarget) {
      this.editUnitFieldsTarget.classList.toggle("hidden", !isUnitBased)
    }

    if (isUnitBased) {
      if (this.hasEditUnitLabelTarget) this.editUnitLabelTarget.value = a.unit_label || ""
      if (this.hasEditPricePerUnitTarget) this.editPricePerUnitTarget.value = a.current_price_per_unit != null ? a.current_price_per_unit : ""
    } else {
      this.editPurchaseDateTarget.value = a.purchase_date || ""
      this.editPurchasePriceTarget.value = a.purchase_price != null ? a.purchase_price : ""
      this.editCurrentValueTarget.value = a.current_value != null ? a.current_value : ""
    }

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
    const toggle = this.editNetWorthTarget.querySelector(".nw-toggle")
    const include_in_net_worth = toggle?.dataset.checked === "true"
    const isUnitBased = this.asset.unit_based === true

    if (!name) { this._showEditError("Asset Name is required"); return }
    if (!asset_type_id) { this._showEditError("Type is required"); return }

    let assetData
    if (isUnitBased) {
      const unit_label = this.hasEditUnitLabelTarget ? this.editUnitLabelTarget.value.trim() : ""
      const ppu = this.hasEditPricePerUnitTarget ? this.editPricePerUnitTarget.value.trim() : ""
      if (!unit_label) { this._showEditError("Unit Label is required"); return }
      if (ppu && parseFloat(ppu) < 0) { this._showEditError("Price per unit must be >= 0"); return }

      assetData = {
        name,
        asset_type_id: Number(asset_type_id),
        unit_label,
        include_in_net_worth
      }
      if (ppu) assetData.current_price_per_unit = parseFloat(ppu)
    } else {
      const current_value = this.editCurrentValueTarget.value.trim()
      const purchase_price = this.editPurchasePriceTarget.value.trim()
      const purchase_date = this.editPurchaseDateTarget.value || null
      if (!current_value || parseFloat(current_value) < 0) { this._showEditError("Current Value must be >= 0"); return }
      if (purchase_price && parseFloat(purchase_price) < 0) { this._showEditError("Purchase Price must be >= 0"); return }

      assetData = {
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
        body: JSON.stringify({ asset: assetData })
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

  // ─── Purchase Lots Tab ─────────────────────────────────
  async fetchLots() {
    if (!this.hasLotsTableBodyTarget) return
    try {
      this.lotsTableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400">Loading...</td></tr>`
      const res = await fetch(this.lotsUrlValue, { credentials: "same-origin" })
      if (res.ok) {
        this.lots = await res.json()
        this.renderLots()
      }
    } catch (e) {
      this.lotsTableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-red-500">Failed to load lots.</td></tr>`
    }
  }

  renderLots() {
    if (!this.hasLotsTableBodyTarget) return

    if (this.lots.length === 0) {
      this.lotsTableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No purchase lots yet. Click <strong>Add Lot</strong> to get started.</td></tr>`
    } else {
      this.lotsTableBodyTarget.innerHTML = this.lots.map(l => this._renderLotRow(l)).join("")
    }

    // Render summary
    if (this.hasLotsSummaryTarget) {
      const a = this.asset
      const tq = a.total_quantity != null ? parseFloat(a.total_quantity) : 0
      const unitLabel = a.unit_label || "units"
      const costBasis = a.total_cost_basis != null ? this._fmt(a.total_cost_basis) : "---"
      const currentValue = this._fmt(a.current_value)
      let gainHtml = "---"
      if (a.unrealized_gain != null) {
        const gain = parseFloat(a.unrealized_gain)
        const color = gain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        const sign = gain >= 0 ? "+" : ""
        gainHtml = `<span class="${color} font-semibold">${sign}${this._fmt(gain)}</span>`
      }

      this.lotsSummaryTarget.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Holdings</p>
              <p class="text-lg font-bold text-gray-900 dark:text-white">${tq.toLocaleString("en-US", {maximumFractionDigits: 6})} ${escapeHtml(unitLabel)}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost Basis</p>
              <p class="text-lg font-bold text-gray-900 dark:text-white tabular-nums">${costBasis}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Value</p>
              <p class="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">${currentValue}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gain / Loss</p>
              <p class="text-lg tabular-nums">${gainHtml}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lots</p>
              <p class="text-lg font-bold text-gray-900 dark:text-white">${this.lots.length}</p>
            </div>
          </div>
        </div>`
    }
  }

  _renderLotRow(l) {
    const qty = parseFloat(l.quantity).toLocaleString("en-US", {maximumFractionDigits: 6})
    const notes = l.notes ? escapeHtml(l.notes) : ""
    let entryInfo = ""
    if (l.entry_form && l.entry_quantity != null) {
      const eq = parseFloat(l.entry_quantity).toLocaleString("en-US", {maximumFractionDigits: 6})
      entryInfo = `<br><span class="text-xs text-gray-400">(entered: ${eq} ${escapeHtml(l.entry_form)})</span>`
    }
    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-6 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(l.acquired_date || "")}</td>
      <td class="px-6 py-3 text-sm text-gray-900 dark:text-white text-right tabular-nums">${qty}${entryInfo}</td>
      <td class="px-6 py-3 text-sm text-gray-900 dark:text-white text-right tabular-nums">${this._fmt(l.price_per_unit)}</td>
      <td class="px-6 py-3 text-sm text-gray-900 dark:text-white text-right tabular-nums font-semibold">${this._fmt(l.total_cost)}</td>
      <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title="${notes}">${notes}</td>
      <td class="px-6 py-3 text-right space-x-2">
        <button type="button" data-id="${l.id}" data-action="click->asset-detail#editLot"
                class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">Edit</button>
        <button type="button" data-id="${l.id}" data-action="click->asset-detail#deleteLot"
                class="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
      </td>
    </tr>`
  }

  openAddLot() {
    if (this.activeTab !== "lots") {
      const btn = this.tabBtnTargets.find(b => b.dataset.tab === "lots")
      if (btn) btn.click()
    }
    this._editingLotId = null
    if (this.hasLotModalTitleTarget) this.lotModalTitleTarget.textContent = "Add Purchase Lot"
    const modal = this.element.querySelector("[data-role='lot-modal']")
    if (modal) {
      modal.querySelector("[data-role='lot-date']").value = new Date().toISOString().split("T")[0]
      modal.querySelector("[data-role='lot-quantity']").value = ""
      modal.querySelector("[data-role='lot-price']").value = ""
      modal.querySelector("[data-role='lot-notes']").value = ""
      const totalEl = modal.querySelector("[data-role='lot-total']")
      if (totalEl) totalEl.textContent = "$0.00"
      if (this.hasLotErrorTarget) this.lotErrorTarget.classList.add("hidden")
      modal.classList.remove("hidden")
    }
  }

  editLot(event) {
    const id = Number(event.currentTarget.dataset.id)
    const lot = this.lots.find(l => l.id === id)
    if (!lot) return

    this._editingLotId = id
    if (this.hasLotModalTitleTarget) this.lotModalTitleTarget.textContent = "Edit Purchase Lot"
    const modal = this.element.querySelector("[data-role='lot-modal']")
    if (modal) {
      modal.querySelector("[data-role='lot-date']").value = lot.acquired_date || ""
      modal.querySelector("[data-role='lot-quantity']").value = lot.quantity || ""
      modal.querySelector("[data-role='lot-price']").value = lot.price_per_unit || ""
      const qty = parseFloat(lot.quantity || 0)
      const price = parseFloat(lot.price_per_unit || 0)
      const totalEl = modal.querySelector("[data-role='lot-total']")
      if (totalEl) totalEl.textContent = this._fmt(qty * price)
      modal.querySelector("[data-role='lot-notes']").value = lot.notes || ""
      if (this.hasLotErrorTarget) this.lotErrorTarget.classList.add("hidden")
      modal.classList.remove("hidden")
    }
  }

  cancelLot() {
    const modal = this.element.querySelector("[data-role='lot-modal']")
    if (modal) modal.classList.add("hidden")
    this._editingLotId = null
  }

  computeModalLotTotal() {
    const modal = this.element.querySelector("[data-role='lot-modal']")
    if (!modal) return
    const qty = parseFloat(modal.querySelector("[data-role='lot-quantity']")?.value) || 0
    const ppu = parseFloat(modal.querySelector("[data-role='lot-price']")?.value) || 0
    const totalEl = modal.querySelector("[data-role='lot-total']")
    if (totalEl) totalEl.textContent = this._fmt(qty * ppu)
  }

  async saveLot() {
    const modal = this.element.querySelector("[data-role='lot-modal']")
    const date = modal.querySelector("[data-role='lot-date']").value
    const qty = modal.querySelector("[data-role='lot-quantity']").value.trim()
    const price = modal.querySelector("[data-role='lot-price']").value.trim()
    const notes = modal.querySelector("[data-role='lot-notes']").value.trim()

    if (!date) { this._showLotError("Acquired Date is required"); return }
    if (!qty || parseFloat(qty) <= 0) { this._showLotError("Quantity must be > 0"); return }
    if (!price || parseFloat(price) < 0) { this._showLotError("Price per unit must be >= 0"); return }

    const isEdit = this._editingLotId != null
    const url = isEdit ? `${this.lotsUrlValue}/${this._editingLotId}` : this.lotsUrlValue
    const method = isEdit ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify({
          asset_lot: {
            acquired_date: date,
            quantity: parseFloat(qty),
            price_per_unit: parseFloat(price),
            notes: notes || null
          }
        })
      })
      if (res.ok || res.status === 201) {
        this.cancelLot()
        // Re-fetch lots from server (backend recalculates rollups)
        await Promise.all([this.fetchLots(), this._refreshAsset()])
      } else {
        const err = await res.json().catch(() => ({}))
        this._showLotError(err.errors ? err.errors.join(", ") : "Save failed")
      }
    } catch (e) {
      this._showLotError("Network error")
    }
  }

  async deleteLot(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (!confirm("Delete this purchase lot?")) return

    try {
      const res = await fetch(`${this.lotsUrlValue}/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (res.ok || res.status === 204) {
        this.lots = this.lots.filter(l => l.id !== id)
        await this._refreshAsset()
        this.renderLots()
      }
    } catch (e) { /* silent */ }
  }

  _showLotError(msg) {
    if (this.hasLotErrorTarget) {
      this.lotErrorTarget.textContent = msg
      this.lotErrorTarget.classList.remove("hidden")
    }
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
