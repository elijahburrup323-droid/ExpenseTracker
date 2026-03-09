import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "loading", "treeContainer", "cardContainer", "tooltip",
    "confirmModal", "confirmTitle", "confirmMessage", "confirmBtn",
    "viewToggle"
  ]
  static values = { apiUrl: String, activateUrl: String, deactivateUrl: String, csrfToken: String }

  connect() {
    this.blocks = []
    this.blockMap = {}
    this.pendingAction = null
    this.dismissedKeys = new Set(JSON.parse(localStorage.getItem("fsDismissed") || "[]"))
    this.viewMode = localStorage.getItem("featureStoreView") || "cards"
    this.fetchBlocks()
    this._onResize = () => { if (this.viewMode === "tree") this._drawConnectors() }
    window.addEventListener("resize", this._onResize)
  }

  disconnect() {
    window.removeEventListener("resize", this._onResize)
  }

  // ── Data Fetching ──

  async fetchBlocks() {
    try {
      const res = await fetch(this.apiUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) this.blocks = await res.json()
    } catch (e) { /* silently fail */ }
    this.blockMap = {}
    this.blocks.forEach(b => this.blockMap[b.key] = b)
    this.render()
  }

  // ── View Toggle ──

  switchToCards() {
    this.viewMode = "cards"
    localStorage.setItem("featureStoreView", "cards")
    this.render()
  }

  switchToTree() {
    this.viewMode = "tree"
    localStorage.setItem("featureStoreView", "tree")
    this.render()
  }

  _updateToggleUI() {
    this.viewToggleTargets.forEach(btn => {
      const isActive = btn.dataset.view === this.viewMode
      btn.classList.toggle("bg-brand-600", isActive)
      btn.classList.toggle("text-white", isActive)
      btn.classList.toggle("shadow-sm", isActive)
      btn.classList.toggle("text-gray-500", !isActive)
      btn.classList.toggle("dark:text-gray-400", !isActive)
      btn.classList.toggle("hover:text-gray-700", !isActive)
      btn.classList.toggle("hover:bg-gray-100", !isActive)
    })
  }

  // ── Layout Calculation (Tree View) ──

  _computeRows() {
    const depth = {}
    const compute = (key) => {
      if (depth[key] !== undefined) return depth[key]
      const b = this.blockMap[key]
      if (!b || !b.dependency_keys || b.dependency_keys.length === 0) {
        depth[key] = 0
        return 0
      }
      let maxParent = 0
      b.dependency_keys.forEach(dk => {
        if (this.blockMap[dk]) maxParent = Math.max(maxParent, compute(dk))
      })
      depth[key] = maxParent + 1
      return depth[key]
    }
    this.blocks.forEach(b => compute(b.key))

    const rows = {}
    this.blocks.forEach(b => {
      const r = depth[b.key] || 0
      if (!rows[r]) rows[r] = []
      rows[r].push(b)
    })

    Object.values(rows).forEach(row => row.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))

    return { rows, depth }
  }

  // ── Main Render ──

  render() {
    this.loadingTarget.classList.add("hidden")
    this._updateToggleUI()

    if (this.viewMode === "tree") {
      this.cardContainerTarget.classList.add("hidden")
      this.treeContainerTarget.classList.remove("hidden")
      this._renderTree()
    } else {
      this.treeContainerTarget.classList.add("hidden")
      this.cardContainerTarget.classList.remove("hidden")
      this._renderCards()
    }
  }

  // ── Tree View Rendering ──

  _renderTree() {
    const { rows } = this._computeRows()
    const rowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b)
    const rowLabels = ["Foundation", "Core Features", "Advanced", "Expert"]

    let html = `<svg class="tech-tree-svg" data-feature-store-target="svgLayer"></svg>`

    rowKeys.forEach(r => {
      const label = rowLabels[r] || `Tier ${r}`
      html += `<div class="tech-tree-row" data-row="${r}">`
      html += `<div class="tech-tree-row-label">${label}</div>`
      html += `<div class="tech-tree-nodes">`
      rows[r].forEach(b => { html += this._treeNodeHtml(b) })
      html += `</div></div>`
    })

    // Legend
    html += `<div class="tech-tree-legend">
      <span class="legend-item"><span class="legend-dot active"></span> Active</span>
      <span class="legend-item"><span class="legend-dot inactive"></span> Inactive</span>
      <span class="legend-item"><span class="legend-dot core"></span> Core (always on)</span>
      <span class="legend-item"><span class="legend-dot locked"></span> Locked (deps needed)</span>
      <span class="legend-item"><span class="legend-dot tier-paid"></span> Paid Tier</span>
      <span class="legend-item"><span class="legend-dot tier-advanced"></span> Advanced Tier</span>
      <span class="legend-item"><span class="legend-star">★</span> Recommended</span>
    </div>`

    this.treeContainerTarget.innerHTML = html
    requestAnimationFrame(() => this._drawConnectors())
  }

  _treeNodeHtml(block) {
    const icon = this._iconSvg(block.icon)
    const active = block.active
    const isCore = block.is_core
    const depsOk = block.dependencies_met !== false
    const recommended = block.recommended && !active

    let ringClass = "node-ring-inactive"
    let statusIcon = ""
    if (active) {
      ringClass = "node-ring-active"
      statusIcon = `<div class="node-status-badge active">✓</div>`
    } else if (!depsOk) {
      ringClass = "node-ring-locked"
      statusIcon = `<div class="node-status-badge locked">🔒</div>`
    }

    if (isCore && active) {
      ringClass = "node-ring-core"
    }

    const tierClass = `node-tier-${block.tier || "free"}`
    const recommendedBadge = recommended ? `<div class="node-recommended-badge">★</div>` : ""

    let actions = ["mouseenter->feature-store#showTooltip", "mouseleave->feature-store#hideTooltip"]
    let dataAttrs = ""
    if (active && !isCore) {
      actions.push("click->feature-store#nodeDeactivateClick")
      dataAttrs = `data-key="${this._esc(block.key)}"
        data-name="${this._esc(block.display_name)}"
        data-has-cascade="${(block.cascade_deactivate_names || []).length > 0}"
        data-cascade-names="${this._esc((block.cascade_deactivate_names || []).join(", "))}"`
    } else if (!active && depsOk) {
      actions.push("click->feature-store#nodeActivateClick")
      dataAttrs = `data-key="${this._esc(block.key)}"`
    }

    const clickable = actions.length > 2 ? "node-clickable" : "node-static"

    return `
      <div class="tech-tree-node ${tierClass} ${clickable}" data-block-key="${block.key}"
           data-action="${actions.join(" ")}" ${dataAttrs}
           data-tooltip-title="${this._esc(block.display_name)}"
           data-tooltip-desc="${this._esc(block.description || block.tagline || "")}"
           data-tooltip-tier="${this._esc(block.tier)}"
           data-tooltip-setup="${this._esc(block.estimated_setup || "")}"
           data-tooltip-active="${active ? "Active" : depsOk ? "Available" : "Locked"}">
        ${recommendedBadge}
        <div class="node-icon-wrapper ${ringClass}">
          <div class="node-icon">${icon}</div>
          ${statusIcon}
        </div>
        <div class="node-label">${this._esc(block.display_name)}</div>
      </div>
    `
  }

  // ── Card View Rendering ──

  _renderCards() {
    let html = ""

    // Recommended section
    const recommended = this.blocks.filter(b => b.recommended && !b.active && !this.dismissedKeys.has(b.key))
    const allActive = this.blocks.every(b => b.active)

    if (recommended.length > 0) {
      html += `<div class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <svg class="h-5 w-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          Recommended for You
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">`
      recommended.slice(0, 3).forEach(b => {
        html += this._recommendedCardHtml(b)
      })
      html += `</div></div>`
    } else if (allActive) {
      html += `<div class="mb-8">
        <div class="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center text-center">
          <svg class="h-10 w-10 text-yellow-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
          </svg>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">All features activated!</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Have an idea for a new feature? We'd love to hear it.</p>
        </div>
      </div>`
    }

    // Group features into 4 sections
    const groups = [
      { label: "Core Features", description: "Always enabled — foundational to your budget", blocks: [] },
      { label: "Available Add-Ons", description: "Optional features included with your account", blocks: [] },
      { label: "Premium Features", description: "Advanced tools for deeper budget control", blocks: [] },
      { label: "Advanced Tools", description: "Specialized planning and analysis modules", blocks: [] }
    ]
    const groupMap = { "Core Features": 0, "Available Add-Ons": 1, "Premium Features": 2, "Advanced Tools": 3 }
    this.blocks.forEach(b => {
      const idx = groupMap[b.group] ?? 1
      groups[idx].blocks.push(b)
    })

    groups.forEach(g => {
      if (g.blocks.length === 0) return
      html += `<div class="mb-8">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-1">${g.label}</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">${g.description}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">`
      g.blocks.forEach(b => { html += this._featureCardHtml(b) })
      html += `</div></div>`
    })

    // Legend
    html += `<div class="tech-tree-legend">
      <span class="legend-item"><span class="legend-dot core"></span> Core (always on)</span>
      <span class="legend-item"><span class="legend-dot active"></span> Active</span>
      <span class="legend-item"><span class="legend-dot inactive"></span> Available</span>
      <span class="legend-item"><span class="legend-dot locked"></span> Locked</span>
      <span class="legend-item"><span class="legend-dot tier-paid"></span> Premium</span>
      <span class="legend-item"><span class="legend-dot tier-advanced"></span> Advanced</span>
    </div>`

    this.cardContainerTarget.innerHTML = html
  }

  _recommendedCardHtml(block) {
    const icon = this._iconSvg(block.icon)
    const depsOk = block.dependencies_met !== false
    const tierBadge = this._tierBadgeHtml(block.tier)

    return `
      <div class="fs-card fs-card-dismiss relative rounded-xl border-2 border-yellow-400 dark:border-yellow-500/60 bg-yellow-50/50 dark:bg-yellow-900/10 p-5 hover:shadow-md" data-recommended-card data-block-key="${this._esc(block.key)}">
        <button type="button" class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                data-action="click->feature-store#dismissRecommendation"
                data-suggestion-id="${block.suggestion_id || ""}"
                data-block-key="${this._esc(block.key)}"
                title="Dismiss recommendation">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        ${tierBadge}
        <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
          <div class="w-6 h-6">${icon}</div>
        </div>
        <h3 class="font-semibold text-gray-900 dark:text-white text-sm">${this._esc(block.display_name)}</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${this._esc(block.description || block.tagline || "")}</p>
        <div class="mt-4 flex items-center justify-between">
          <span class="inline-flex items-center text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            <svg class="h-3.5 w-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Recommended
          </span>
          ${depsOk ?
            `<button class="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition"
                     data-action="click->feature-store#nodeActivateClick"
                     data-key="${this._esc(block.key)}">Activate</button>` :
            `<span class="text-xs text-gray-400">Dependencies needed</span>`}
        </div>
      </div>
    `
  }

  _featureCardHtml(block) {
    const icon = this._iconSvg(block.icon)
    const active = block.active
    const isCore = block.is_core
    const depsOk = block.dependencies_met !== false
    const tier = block.tier || "free"

    // Border color logic
    let borderClass = "border-gray-200 dark:border-gray-700"
    let bgClass = "bg-white dark:bg-gray-800"
    let opacityClass = ""

    if (active) {
      if (isCore) {
        borderClass = "border-indigo-500 dark:border-indigo-400"
      } else if (tier === "paid") {
        borderClass = "border-amber-500 dark:border-amber-400"
      } else if (tier === "advanced") {
        borderClass = "border-blue-500 dark:border-blue-400"
      } else {
        borderClass = "border-green-500 dark:border-green-400"
      }
      bgClass = "bg-white dark:bg-gray-800"
    } else if (!depsOk) {
      opacityClass = "opacity-50"
    }

    // Icon bg
    let iconBg = "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
    if (active) {
      if (isCore) {
        iconBg = "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
      } else if (tier === "paid") {
        iconBg = "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      } else if (tier === "advanced") {
        iconBg = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      } else {
        iconBg = "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      }
    }

    const tierBadge = this._tierBadgeHtml(tier)

    // Status label
    let statusLabel = ""
    if (active && isCore) {
      statusLabel = `<span class="text-xs font-medium text-indigo-600 dark:text-indigo-400">Core Feature</span>`
    } else if (active) {
      statusLabel = `<span class="inline-flex items-center text-xs font-medium text-green-600 dark:text-green-400">
        <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/></svg>
        Active</span>`
    } else if (!depsOk) {
      statusLabel = `<span class="inline-flex items-center text-xs text-gray-400">
        <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75"/></svg>
        Dependencies needed</span>`
    } else {
      statusLabel = `<span class="text-xs text-gray-500 dark:text-gray-400">Available</span>`
    }

    // Action button
    let actionBtn = ""
    if (active && !isCore) {
      actionBtn = `<button class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition"
                           data-action="click->feature-store#nodeDeactivateClick"
                           data-key="${this._esc(block.key)}"
                           data-name="${this._esc(block.display_name)}"
                           data-has-cascade="${(block.cascade_deactivate_names || []).length > 0}"
                           data-cascade-names="${this._esc((block.cascade_deactivate_names || []).join(", "))}">Deactivate</button>`
    } else if (!active && depsOk) {
      actionBtn = `<button class="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition"
                           data-action="click->feature-store#nodeActivateClick"
                           data-key="${this._esc(block.key)}">Activate</button>`
    }

    return `
      <div class="fs-card relative rounded-xl border-2 ${borderClass} ${bgClass} ${opacityClass} p-5">
        ${tierBadge}
        <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 ${iconBg}">
          <div class="w-6 h-6">${icon}</div>
        </div>
        <h3 class="font-semibold text-gray-900 dark:text-white text-sm">${this._esc(block.display_name)}</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${this._esc(block.description || block.tagline || "")}</p>
        ${!isCore && block.estimated_setup ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">${this._esc(block.estimated_setup)} setup</p>` : ""}
        <div class="mt-4 flex items-center justify-between">
          ${statusLabel}
          ${actionBtn}
        </div>
      </div>
    `
  }

  _tierBadgeHtml(tier) {
    if (tier === "paid") {
      return `<span class="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-300/50 dark:ring-amber-500/30">Premium</span>`
    }
    if (tier === "advanced") {
      return `<span class="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-300/50 dark:ring-blue-500/30">Advanced</span>`
    }
    return ""
  }

  // ── Dismiss Recommendation ──

  async dismissRecommendation(event) {
    event.stopPropagation()
    const btn = event.currentTarget
    const blockKey = btn.dataset.blockKey
    const suggestionId = btn.dataset.suggestionId
    const card = btn.closest("[data-recommended-card]")

    // Animate out
    if (card) {
      card.classList.add("fs-card-hiding")
    }

    // Track locally
    this.dismissedKeys.add(blockKey)
    localStorage.setItem("fsDismissed", JSON.stringify([...this.dismissedKeys]))

    // API dismiss if we have suggestion ID
    if (suggestionId) {
      try {
        await fetch(`/api/smart_suggestions/${suggestionId}/dismiss`, {
          method: "POST",
          headers: { "X-CSRF-Token": this.csrfTokenValue, "Accept": "application/json" }
        })
      } catch (e) { /* non-critical */ }
    }

    // Re-render after animation
    setTimeout(() => this._renderCards(), 220)
  }

  // ── SVG Connectors (Tree View) ──

  _drawConnectors() {
    const svg = this.treeContainerTarget.querySelector(".tech-tree-svg")
    if (!svg) return

    const container = this.treeContainerTarget
    const rect = container.getBoundingClientRect()
    svg.setAttribute("width", container.scrollWidth)
    svg.setAttribute("height", container.scrollHeight)
    svg.style.width = container.scrollWidth + "px"
    svg.style.height = container.scrollHeight + "px"

    let paths = ""
    this.blocks.forEach(b => {
      if (!b.dependency_keys || b.dependency_keys.length === 0) return
      const childEl = container.querySelector(`[data-block-key="${b.key}"]`)
      if (!childEl) return

      b.dependency_keys.forEach(dk => {
        const parentEl = container.querySelector(`[data-block-key="${dk}"]`)
        if (!parentEl) return

        const pRect = parentEl.getBoundingClientRect()
        const cRect = childEl.getBoundingClientRect()

        const x1 = pRect.left + pRect.width / 2 - rect.left
        const y1 = pRect.bottom - rect.top
        const x2 = cRect.left + cRect.width / 2 - rect.left
        const y2 = cRect.top - rect.top

        const midY = (y1 + y2) / 2
        const active = this.blockMap[dk]?.active && b.active

        paths += `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}"
          fill="none"
          stroke="${active ? "rgb(34, 197, 94)" : "rgb(156, 163, 175)"}"
          stroke-width="${active ? 2.5 : 1.5}"
          stroke-dasharray="${active ? "" : "6 4"}"
          opacity="${active ? 0.8 : 0.35}" />`
      })
    })
    svg.innerHTML = paths
  }

  // ── Tooltip (Tree View) ──

  showTooltip(event) {
    const node = event.currentTarget
    const tip = this.tooltipTarget
    tip.innerHTML = `
      <div class="tip-title">${node.dataset.tooltipTitle}</div>
      ${node.dataset.tooltipDesc ? `<div class="tip-desc">${node.dataset.tooltipDesc}</div>` : ""}
      <div class="tip-meta">
        <span class="tip-tier">${node.dataset.tooltipTier}</span>
        ${node.dataset.tooltipSetup ? `<span class="tip-setup">${node.dataset.tooltipSetup} setup</span>` : ""}
        <span class="tip-status tip-status-${node.dataset.tooltipActive.toLowerCase()}">${node.dataset.tooltipActive}</span>
      </div>
    `
    const nRect = node.getBoundingClientRect()
    const cRect = this.treeContainerTarget.getBoundingClientRect()
    tip.style.left = (nRect.left + nRect.width / 2 - cRect.left) + "px"
    tip.style.top = (nRect.top - cRect.top - 8) + "px"
    tip.classList.remove("hidden")
  }

  hideTooltip() {
    this.tooltipTarget.classList.add("hidden")
  }

  // ── Node Click Actions ──

  nodeActivateClick(event) {
    const key = event.currentTarget.dataset.key
    this._activate(key)
  }

  nodeDeactivateClick(event) {
    const el = event.currentTarget
    const key = el.dataset.key
    const name = el.dataset.name
    const hasCascade = el.dataset.hasCascade === "true"
    const cascadeNames = el.dataset.cascadeNames

    if (hasCascade) {
      this.confirmTitleTarget.textContent = `Deactivate ${name}?`
      this.confirmMessageTarget.textContent = `This will also deactivate: ${cascadeNames}. You can reactivate them anytime.`
      this.confirmBtnTarget.classList.remove("hidden")
      this.confirmBtnTarget.textContent = "Deactivate All"
      this.confirmBtnTarget.onclick = () => this.confirmAction()
      this.confirmModalTarget.classList.remove("hidden")
      this.pendingAction = { type: "deactivate", key }
      return
    }

    this.confirmTitleTarget.textContent = `Deactivate ${name}?`
    this.confirmMessageTarget.textContent = `This will hide ${name} from your sidebar. You can reactivate it anytime.`
    this.confirmBtnTarget.classList.remove("hidden")
    this.confirmBtnTarget.textContent = "Deactivate"
    this.confirmBtnTarget.onclick = () => this.confirmAction()
    this.confirmModalTarget.classList.remove("hidden")
    this.pendingAction = { type: "deactivate", key }
  }

  // ── API Actions ──

  async _activate(key) {
    try {
      const res = await fetch(this.activateUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ key })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.activate_path) {
          window.location.href = data.activate_path + "?flash_sidebar=1&start_tutorial=1"
        } else {
          window.location.reload()
        }
      } else {
        const data = await res.json()
        alert((data.errors || ["Activation failed."]).join("\n"))
      }
    } catch (e) {
      alert("Network error — please try again.")
    }
  }

  async confirmAction() {
    if (!this.pendingAction) return
    const action = this.pendingAction
    this.closeConfirm()
    if (action.type === "deactivate") {
      await this._deactivate(action.key)
    }
  }

  async _deactivate(key) {
    try {
      const res = await fetch(this.deactivateUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify({ key })
      })
      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert((data.errors || ["Deactivation failed."]).join("\n"))
      }
    } catch (e) {
      alert("Network error — please try again.")
    }
  }

  closeConfirm() {
    this.confirmModalTarget.classList.add("hidden")
    this.pendingAction = null
  }

  // ── Icon Map ──

  _iconSvg(name) {
    const icons = {
      "home": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>`,
      "credit-card": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>`,
      "lock-closed": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>`,
      "currency-dollar": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      "arrow-path": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"/></svg>`,
      "arrows-right-left": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>`,
      "tag": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z"/></svg>`,
      "cube-transparent": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25"/></svg>`,
      "arrow-up-tray": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>`,
      "check-circle": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      "chart-bar": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>`,
      "calculator": `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM5.25 20.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/></svg>`
    }
    return icons[name] || icons["cube-transparent"]
  }

  // ── Helpers ──

  _esc(str) {
    if (!str) return ""
    const el = document.createElement("span")
    el.textContent = str
    return el.innerHTML
  }
}
