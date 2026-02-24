import { Controller } from "@hotwired/stimulus"

// ─── Column Detection Heuristics ─────────────────────────────────
const COLUMN_HEURISTICS = {
  date: {
    exact: ["date", "transaction date", "trans date", "posted date", "posting date", "value date", "trade date"],
    partial: ["date", "posted", "effective"],
  },
  description: {
    exact: ["description", "memo", "payee", "name", "narrative", "transaction description", "details", "merchant"],
    partial: ["desc", "memo", "payee", "narr", "detail", "merchant"],
  },
  amount: {
    exact: ["amount", "transaction amount", "value", "sum"],
    partial: ["amt", "amount", "value"],
  },
  debit: {
    exact: ["debit", "debit amount", "withdrawal"],
    partial: ["debit", "withdrawal", "expense"],
  },
  credit: {
    exact: ["credit", "credit amount", "deposit"],
    partial: ["credit", "deposit"],
  },
  reference: {
    exact: ["reference", "check number", "ref", "transaction id", "confirmation", "check no"],
    partial: ["ref", "check", "conf", "num"],
  },
}

const FIELD_OPTIONS = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "debit", label: "Debit Amount" },
  { key: "credit", label: "Credit Amount" },
  { key: "reference", label: "Reference" },
  { key: "skip", label: "-- Skip --" },
]

const DATE_FORMATS = [
  { key: "MM/DD/YYYY", pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
  { key: "MM/DD/YY",   pattern: /^\d{1,2}\/\d{1,2}\/\d{2}$/ },
  { key: "YYYY-MM-DD", pattern: /^\d{4}-\d{2}-\d{2}$/ },
  { key: "MM-DD-YYYY", pattern: /^\d{1,2}-\d{1,2}-\d{4}$/ },
  { key: "YYYYMMDD",   pattern: /^\d{8}$/ },
]

const TRANSFER_KEYWORDS = [
  /transfer/i, /xfer/i, /payment to [\w\s]+account/i,
  /from [\w\s]+account/i, /online banking transfer/i,
  /mobile transfer/i, /zelle/i, /venmo/i,
]

// ─── Helpers ─────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

function formatCurrency(amount) {
  const n = parseFloat(amount) || 0
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function tooltipHtml(text) {
  return `<span class="relative group inline-block ml-1 cursor-help align-middle">
    <svg class="inline h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <span class="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg leading-relaxed">${escapeHtml(text)}</span>
  </span>`
}

// ─── Controller ──────────────────────────────────────────────────
export default class extends Controller {
  static targets = [
    "stepper", "stepperContainer", "progressBar", "stepLabel",
    "phaseContainer", "backBtn", "cancelBtn", "nextBtn", "importBtn",
  ]
  static values = {
    sessionsUrl: String,
    templatesUrl: String,
    accountsUrl: String,
    categoriesUrl: String,
    csrfToken: String,
  }

  // ─── Lifecycle ────────────────────────────────────────────────
  connect() {
    this.step = 1
    this.sessionId = null
    this.fileType = null
    this.fileName = null
    this.headers = []
    this.parsedRows = []
    this.columnMapping = {}
    this.dateFormat = null
    this.amountConvention = "negative_expense"
    this.accounts = []
    this.categories = []
    this.sessionRows = []
    this.classifyFilter = "all"
    this.classifyPage = 1
    this.classifyPerPage = 25
    this.matchedTemplate = null

    this._fetchAccounts()
    this._fetchCategories()
    this._renderStep()
  }

  disconnect() {}

  // ─── Navigation ───────────────────────────────────────────────
  goNext() {
    if (this.step === 1 && !this._validateStep1()) return
    if (this.step === 2 && !this._validateStep2()) return
    if (this.step === 3) this._saveClassifications()
    if (this.step === 4 && !this._validateStep4()) return

    if (this.step === 2) this._submitMapping()
    else if (this.step === 3) this._submitClassifications()
    else if (this.step === 4) this._submitAssignments()
    else {
      this.step++
      this._renderStep()
    }
  }

  goBack() {
    if (this.step > 1) {
      this.step--
      this._renderStep()
    }
  }

  cancel() {
    if (confirm("Are you sure you want to cancel this import? All progress will be lost.")) {
      window.location.href = "/"
    }
  }

  // ─── Data Fetching ────────────────────────────────────────────
  async _fetchAccounts() {
    try {
      const res = await fetch(this.accountsUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) this.accounts = await res.json()
    } catch (e) { console.error("Failed to fetch accounts:", e) }
  }

  async _fetchCategories() {
    try {
      const res = await fetch(this.categoriesUrlValue, { headers: { "Accept": "application/json" } })
      if (res.ok) this.categories = await res.json()
    } catch (e) { console.error("Failed to fetch categories:", e) }
  }

  // ─── Step Rendering ───────────────────────────────────────────
  _renderStep() {
    const progress = [0, 20, 40, 60, 80, 100]
    this.progressBarTarget.style.width = `${progress[this.step]}%`
    this.stepLabelTarget.textContent = `Step ${this.step} of 5`

    // Update stepper circles
    for (let i = 1; i <= 5; i++) {
      const circle = this.element.querySelector(`[data-smart-import-step-circle="${i}"]`)
      const label = this.element.querySelector(`[data-smart-import-step-label="${i}"]`)
      const connector = this.element.querySelector(`[data-smart-import-connector="${i}"]`)
      if (!circle) continue

      if (i < this.step) {
        circle.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 border-green-500 bg-green-500 text-white"
        circle.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>'
        if (label) label.className = "text-xs mt-1 text-green-600 dark:text-green-400 hidden sm:block"
      } else if (i === this.step) {
        circle.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 border-brand-600 bg-brand-600 text-white"
        circle.textContent = i
        if (label) label.className = "text-xs mt-1 text-brand-600 dark:text-brand-400 font-semibold hidden sm:block"
      } else {
        circle.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800"
        circle.textContent = i
        if (label) label.className = "text-xs mt-1 text-gray-400 dark:text-gray-500 hidden sm:block"
      }
      if (connector) {
        connector.className = i <= this.step
          ? "w-8 sm:w-12 h-0.5 mx-1 bg-green-500 transition-all duration-300"
          : "w-8 sm:w-12 h-0.5 mx-1 bg-gray-300 dark:bg-gray-600 transition-all duration-300"
      }
    }

    // Show/hide footer buttons
    this.backBtnTarget.classList.toggle("hidden", this.step === 1)
    this.cancelBtnTarget.classList.toggle("hidden", this.step === 5)
    this.nextBtnTarget.classList.toggle("hidden", this.step === 5)
    this.importBtnTarget.classList.toggle("hidden", this.step !== 5)

    // Render phase content
    switch (this.step) {
      case 1: this._renderStep1(); break
      case 2: this._renderStep2(); break
      case 3: this._renderStep3(); break
      case 4: this._renderStep4(); break
      case 5: this._renderStep5(); break
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Upload File & Select Account
  // ═══════════════════════════════════════════════════════════════
  _renderStep1() {
    const accountOptions = this.accounts.map(a =>
      `<option value="${a.id}">${escapeHtml(a.name)}${a.institution ? ' (' + escapeHtml(a.institution) + ')' : ''}</option>`
    ).join("")

    this.phaseContainerTarget.innerHTML = `
      <div class="space-y-6 pb-4">
        <div class="text-center">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Which account are these transactions for?
            ${tooltipHtml("We need to know which account this file came from so transactions land in the right place.")}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Pick the bank account, then drop in your file.</p>
        </div>

        <div class="max-w-md mx-auto space-y-4">
          <div class="ring-2 ring-brand-500 rounded-lg p-3 transition-all" id="si-account-highlight">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
            <select id="si-account-select" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-brand-500 focus:border-brand-500">
              <option value="">Select an account...</option>
              ${accountOptions}
            </select>
          </div>

          <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-brand-500 dark:hover:border-brand-400 transition cursor-pointer"
               id="si-drop-zone"
               data-action="click->smart-import#triggerFileInput dragover->smart-import#dragOver dragdrop->smart-import#handleDrop drop->smart-import#handleDrop dragleave->smart-import#dragLeave">
            <svg class="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300" id="si-drop-text">Drop your file here or click to browse</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">CSV, OFX, QFX, or QBO &middot; Max 5 MB</p>
            <input type="file" class="hidden" id="si-file-input" accept=".csv,.ofx,.qfx,.qbo"
                   data-action="change->smart-import#fileSelected">
          </div>

          <div class="hidden" id="si-file-info">
            <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div class="flex items-center space-x-2">
                <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span class="text-sm font-medium text-green-800 dark:text-green-300" id="si-file-name-display"></span>
              </div>
              <span class="text-xs text-green-600 dark:text-green-400 font-semibold" id="si-file-badge"></span>
            </div>
          </div>

          <div class="hidden" id="si-template-suggestion">
            <div class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                <span class="text-sm font-semibold text-brand-800 dark:text-brand-300">Saved template found!</span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">We recognize this file format. Use template "<span id="si-template-name" class="font-semibold"></span>" to skip column mapping?</p>
              <div class="flex space-x-2">
                <button class="px-3 py-1 text-xs font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 transition" data-action="click->smart-import#applyTemplate">Use Template</button>
                <button class="px-3 py-1 text-xs font-medium rounded-md text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition" data-action="click->smart-import#skipTemplate">Map Manually</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  triggerFileInput() { document.getElementById("si-file-input").click() }

  dragOver(e) {
    e.preventDefault()
    document.getElementById("si-drop-zone").classList.add("border-brand-500", "bg-brand-50", "dark:bg-brand-900/10")
  }

  dragLeave(e) {
    e.preventDefault()
    document.getElementById("si-drop-zone").classList.remove("border-brand-500", "bg-brand-50", "dark:bg-brand-900/10")
  }

  handleDrop(e) {
    e.preventDefault()
    this.dragLeave(e)
    const file = e.dataTransfer?.files?.[0]
    if (file) this._processFile(file)
  }

  fileSelected(e) {
    const file = e.target.files?.[0]
    if (file) this._processFile(file)
  }

  _processFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5 MB.")
      return
    }

    const ext = file.name.split(".").pop().toLowerCase()
    if (!["csv", "ofx", "qfx", "qbo"].includes(ext)) {
      alert("Unsupported file type. Please use CSV, OFX, QFX, or QBO.")
      return
    }

    this.fileName = file.name
    this.fileType = ext

    const reader = new FileReader()
    reader.onload = (evt) => {
      if (ext === "csv") {
        this._parseCSV(evt.target.result)
      } else {
        this._ofxContent = evt.target.result
        this._showFileInfo()
      }
    }
    reader.readAsText(file)
  }

  // CSV Parser (from upload_controller.js)
  _parseCSV(text) {
    const rows = []
    let current = ""
    let inQuotes = false
    let row = []
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { current += '"'; i++ }
        else if (ch === '"') { inQuotes = false }
        else { current += ch }
      } else {
        if (ch === '"') { inQuotes = true }
        else if (ch === ",") { row.push(current.trim()); current = "" }
        else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++
          row.push(current.trim()); current = ""
          if (row.some(c => c !== "")) rows.push(row)
          row = []
        } else { current += ch }
      }
    }
    row.push(current.trim())
    if (row.some(c => c !== "")) rows.push(row)

    if (rows.length < 2) {
      alert("File appears empty or has no data rows.")
      return
    }

    this.headers = rows[0]
    this.parsedRows = rows.slice(1)
    this._showFileInfo()
    this._checkTemplateMatch()
  }

  _showFileInfo() {
    const infoEl = document.getElementById("si-file-info")
    const nameEl = document.getElementById("si-file-name-display")
    const badgeEl = document.getElementById("si-file-badge")
    const dropText = document.getElementById("si-drop-text")

    if (infoEl) infoEl.classList.remove("hidden")
    if (nameEl) nameEl.textContent = this.fileName
    if (badgeEl) badgeEl.textContent = `${this.fileType.toUpperCase()} · ${this.parsedRows.length || "?"} rows`
    if (dropText) dropText.textContent = "File loaded! Click to change."

    // Remove highlight from account selector
    const highlight = document.getElementById("si-account-highlight")
    if (highlight) highlight.classList.remove("ring-2", "ring-brand-500")
  }

  async _checkTemplateMatch() {
    if (this.headers.length === 0) return
    const sig = await this._generateSignature(this.headers)
    try {
      const res = await fetch(`${this.templatesUrlValue}?column_signature=${sig}`, {
        headers: { "Accept": "application/json" }
      })
      if (res.ok) {
        const templates = await res.json()
        if (templates.length > 0) {
          this.matchedTemplate = templates[0]
          const suggEl = document.getElementById("si-template-suggestion")
          const nameEl = document.getElementById("si-template-name")
          if (suggEl) suggEl.classList.remove("hidden")
          if (nameEl) nameEl.textContent = this.matchedTemplate.name
        }
      }
    } catch (e) { console.error("Template check failed:", e) }
  }

  async _generateSignature(headers) {
    const normalized = headers.map(h => h.toLowerCase().trim()).sort().join("|")
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)
    const hash = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
  }

  applyTemplate() {
    if (!this.matchedTemplate) return
    this.columnMapping = this.matchedTemplate.column_mapping || {}
    this.dateFormat = this.matchedTemplate.date_format
    this.amountConvention = this.matchedTemplate.amount_sign_convention || "negative_expense"
    // Skip to step 2 with pre-filled mapping, then allow user to proceed quickly
    this.step = 2
    this._renderStep()
  }

  skipTemplate() {
    document.getElementById("si-template-suggestion")?.classList.add("hidden")
    this.matchedTemplate = null
  }

  _validateStep1() {
    const acctSelect = document.getElementById("si-account-select")
    if (!acctSelect?.value) {
      alert("Please select an account first.")
      return false
    }
    if (!this.fileName) {
      alert("Please upload a file.")
      return false
    }
    this._selectedAccountId = parseInt(acctSelect.value)

    // Create the session on the server
    this._createSession()
    return false // goNext will be called after async createSession completes
  }

  async _createSession() {
    const body = {
      account_id: this._selectedAccountId,
      file_name: this.fileName,
      file_type: this.fileType,
    }

    if (this.fileType === "csv") {
      body.headers = this.headers
      body.rows = this.parsedRows
    } else {
      body.file_content = this._ofxContent
    }

    try {
      const res = await fetch(this.sessionsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        this.sessionId = data.id
        this.sessionRows = data.rows || []

        // For OFX, the server already mapped the data
        if (this.fileType !== "csv") {
          this.headers = ["Date", "Amount", "Description", "Memo"]
          this.parsedRows = this.sessionRows.map(r => [
            r.mapped_data?.date, r.mapped_data?.amount, r.mapped_data?.description, r.mapped_data?.memo
          ])
        }

        this.step = 2
        this._renderStep()
      } else {
        const err = await res.json()
        alert(err.errors?.[0] || "Failed to create import session.")
      }
    } catch (e) {
      alert("Network error. Please try again.")
      console.error(e)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Map Columns (Option C: Inline Annotation)
  // ═══════════════════════════════════════════════════════════════
  _renderStep2() {
    const previewCount = Math.min(5, this.parsedRows.length)
    const colCount = this.headers.length

    // Auto-detect column types if no mapping exists
    if (Object.keys(this.columnMapping).length === 0) {
      for (let i = 0; i < colCount; i++) {
        const samples = this.parsedRows.slice(0, 10).map(r => r[i] || "")
        const detected = this._detectColumnType(this.headers[i], samples)
        this.columnMapping[i] = detected.key
      }
    }

    // Auto-detect date format
    if (!this.dateFormat) {
      const dateColIdx = Object.keys(this.columnMapping).find(k => this.columnMapping[k] === "date")
      if (dateColIdx !== undefined) {
        const samples = this.parsedRows.slice(0, 10).map(r => r[dateColIdx] || "")
        this.dateFormat = this._detectDateFormat(samples)
      }
    }

    // Build column select dropdowns
    let colHeaders = ""
    let originalHeaders = ""
    for (let i = 0; i < colCount; i++) {
      const mapped = this.columnMapping[i] || "skip"
      const confidence = this._getConfidence(this.headers[i], mapped)
      const bgClass = mapped === "skip" ? "bg-gray-50 dark:bg-gray-800/50" : "bg-green-50 dark:bg-green-900/20"
      const borderClass = mapped === "skip" ? "border-gray-200 dark:border-gray-700" : "border-green-300 dark:border-green-700"

      const opts = FIELD_OPTIONS.map(f =>
        `<option value="${f.key}" ${f.key === mapped ? "selected" : ""}>${escapeHtml(f.label)}</option>`
      ).join("")

      colHeaders += `<td class="${bgClass} border ${borderClass} px-3 py-2 align-top" style="min-width:130px">
        <select class="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs focus:ring-brand-500 focus:border-brand-500"
                data-col-idx="${i}" data-action="change->smart-import#columnMappingChanged">
          ${opts}
        </select>
        <div class="mt-1 text-xs ${confidence === 'HIGH' ? 'text-green-600' : confidence === 'MEDIUM' ? 'text-yellow-600' : 'text-gray-400'}">
          <span class="inline-block w-2 h-2 rounded-full ${confidence === 'HIGH' ? 'bg-green-500' : confidence === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-400'} mr-1"></span>
          ${confidence}
        </div>
      </td>`

      originalHeaders += `<td class="${bgClass} border ${borderClass} px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">"${escapeHtml(this.headers[i])}"</td>`
    }

    // Build data preview rows
    let dataRows = ""
    for (let r = 0; r < previewCount; r++) {
      let cells = ""
      for (let c = 0; c < colCount; c++) {
        const mapped = this.columnMapping[c] || "skip"
        const bgClass = mapped === "skip" ? "bg-gray-50 dark:bg-gray-800/50" : "bg-green-50 dark:bg-green-900/20"
        const borderClass = mapped === "skip" ? "border-gray-200 dark:border-gray-700" : "border-green-300 dark:border-green-700"
        const val = this.parsedRows[r]?.[c] || ""
        let displayVal = escapeHtml(val)

        if (mapped === "amount" || mapped === "debit" || mapped === "credit") {
          const num = parseFloat(val.replace(/[^0-9.\-]/g, ""))
          if (!isNaN(num)) {
            displayVal = num < 0
              ? `<span class="text-red-600 dark:text-red-400 font-medium">${escapeHtml(val)}</span>`
              : `<span class="text-green-600 dark:text-green-400 font-medium">${escapeHtml(val)}</span>`
          }
        }
        if (mapped === "skip") displayVal = `<span class="text-gray-400">${displayVal}</span>`

        cells += `<td class="${bgClass} border ${borderClass} px-3 py-1.5 text-sm">${displayVal}</td>`
      }
      dataRows += `<tr>${cells}</tr>`
    }

    this.phaseContainerTarget.innerHTML = `
      <div class="space-y-4 pb-4">
        <div class="text-center">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Tell us what each column means
            ${tooltipHtml("Every bank formats files differently. We need you to confirm what each column means — we already made our best guess.")}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            We found <strong>${colCount} columns</strong> and <strong>${this.parsedRows.length} rows</strong>.
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 ml-1">Green</span> = auto-detected.
          </p>
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-left">
            <tr>${colHeaders}</tr>
            <tr class="bg-gray-100 dark:bg-gray-700/50">${originalHeaders}</tr>
            ${dataRows}
          </table>
        </div>

        <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount Sign Convention</div>
          <div class="flex flex-col sm:flex-row gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="radio" name="si-sign" value="negative_expense" ${this.amountConvention === "negative_expense" ? "checked" : ""}
                     data-action="change->smart-import#signConventionChanged"
                     class="text-brand-600 focus:ring-brand-500">
              Negative = Expense (most banks)
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="radio" name="si-sign" value="positive_expense" ${this.amountConvention === "positive_expense" ? "checked" : ""}
                     data-action="change->smart-import#signConventionChanged"
                     class="text-brand-600 focus:ring-brand-500">
              Negative = Deposit
            </label>
          </div>
        </div>

        <div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <svg class="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div class="text-sm text-blue-800 dark:text-blue-300">
            <strong>Preview:</strong> ${this.parsedRows.length} rows &middot; Date format: ${this.dateFormat || "auto-detected"}
          </div>
        </div>
      </div>
    `
  }

  columnMappingChanged(e) {
    const idx = parseInt(e.target.dataset.colIdx)
    this.columnMapping[idx] = e.target.value
    this._renderStep2()
  }

  signConventionChanged(e) {
    this.amountConvention = e.target.value
  }

  _detectColumnType(headerName, samples) {
    const name = headerName.toLowerCase().trim()
    for (const [key, rules] of Object.entries(COLUMN_HEURISTICS)) {
      if (rules.exact.includes(name)) return { key, confidence: "HIGH" }
    }
    for (const [key, rules] of Object.entries(COLUMN_HEURISTICS)) {
      if (rules.partial.some(p => name.includes(p))) return { key, confidence: "MEDIUM" }
    }
    // Type-only inference from data samples
    const nonEmpty = samples.filter(s => s.trim() !== "")
    if (nonEmpty.length > 0) {
      const allNumeric = nonEmpty.every(s => /^-?[\d,]+\.?\d*$/.test(s.replace(/[$,]/g, "")))
      if (allNumeric) return { key: "amount", confidence: "LOW" }
      const allDates = nonEmpty.every(s => DATE_FORMATS.some(f => f.pattern.test(s.trim())))
      if (allDates) return { key: "date", confidence: "LOW" }
    }
    return { key: "skip", confidence: "NONE" }
  }

  _getConfidence(headerName, mappedKey) {
    if (mappedKey === "skip") return "N/A"
    const name = headerName.toLowerCase().trim()
    const rules = COLUMN_HEURISTICS[mappedKey]
    if (!rules) return "MANUAL"
    if (rules.exact.includes(name)) return "HIGH"
    if (rules.partial.some(p => name.includes(p))) return "MEDIUM"
    return "LOW"
  }

  _detectDateFormat(samples) {
    for (const fmt of DATE_FORMATS) {
      const matches = samples.filter(s => s.trim() !== "" && fmt.pattern.test(s.trim()))
      if (matches.length >= Math.min(3, samples.filter(s => s.trim() !== "").length)) {
        return fmt.key
      }
    }
    return "MM/DD/YYYY"
  }

  _validateStep2() {
    const hasDate = Object.values(this.columnMapping).includes("date")
    const hasDesc = Object.values(this.columnMapping).includes("description")
    const hasAmount = Object.values(this.columnMapping).includes("amount") ||
                      Object.values(this.columnMapping).includes("debit") ||
                      Object.values(this.columnMapping).includes("credit")

    if (!hasDate) { alert("Please map at least one column to Date."); return false }
    if (!hasDesc) { alert("Please map at least one column to Description."); return false }
    if (!hasAmount) { alert("Please map at least one column to Amount (or Debit/Credit)."); return false }
    return true
  }

  async _submitMapping() {
    try {
      const res = await fetch(`${this.sessionsUrlValue}/${this.sessionId}/map_columns`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue,
        },
        body: JSON.stringify({
          column_mapping: this.columnMapping,
          date_format: this.dateFormat,
          amount_convention: this.amountConvention,
        }),
      })

      if (res.ok) {
        // Fetch updated session with mapped rows
        const sessionRes = await fetch(`${this.sessionsUrlValue}/${this.sessionId}?per_page=500`, {
          headers: { "Accept": "application/json" }
        })
        if (sessionRes.ok) {
          const data = await sessionRes.json()
          this.sessionRows = data.rows || []
        }

        // Auto-classify all rows
        this._autoClassify()
        this.step = 3
        this._renderStep()
      } else {
        const err = await res.json()
        alert(err.errors?.[0] || "Failed to save column mapping.")
      }
    } catch (e) {
      alert("Network error. Please try again.")
      console.error(e)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Classify Transactions
  // ═══════════════════════════════════════════════════════════════
  _autoClassify() {
    this.sessionRows.forEach(row => {
      const mapped = row.mapped_data || {}
      const amount = parseFloat(mapped.amount) || 0
      const desc = (mapped.description || "").toLowerCase()

      // Transfer detection
      if (TRANSFER_KEYWORDS.some(kw => kw.test(desc))) {
        row.classification = "transfer"
      } else if (this.amountConvention === "negative_expense") {
        row.classification = amount < 0 ? "payment" : "deposit"
      } else {
        row.classification = amount > 0 ? "payment" : "deposit"
      }
    })
  }

  _saveClassifications() {
    // Read current state from DOM selects
    this.sessionRows.forEach(row => {
      const sel = document.getElementById(`si-classify-${row.id}`)
      if (sel) row.classification = sel.value
    })
  }

  _renderStep3() {
    const counts = { all: this.sessionRows.length, payment: 0, deposit: 0, transfer: 0, skip: 0 }
    this.sessionRows.forEach(r => { if (counts[r.classification] !== undefined) counts[r.classification]++ })

    const filtered = this.classifyFilter === "all"
      ? this.sessionRows
      : this.sessionRows.filter(r => r.classification === this.classifyFilter)

    const totalPages = Math.ceil(filtered.length / this.classifyPerPage)
    const pageRows = filtered.slice((this.classifyPage - 1) * this.classifyPerPage, this.classifyPage * this.classifyPerPage)

    const tabClass = (key) => key === this.classifyFilter
      ? "px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white"
      : "px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer"

    const dotColor = { payment: "bg-red-500", deposit: "bg-green-500", transfer: "bg-blue-500", skip: "bg-gray-400" }

    let tabsHtml = `<button class="${tabClass("all")}" data-action="click->smart-import#classifyFilterAll">All (${counts.all})</button>`
    for (const key of ["payment", "deposit", "transfer", "skip"]) {
      tabsHtml += `<button class="${tabClass(key)}" data-action="click->smart-import#classifyFilter" data-filter="${key}">
        <span class="inline-block w-2 h-2 rounded-full ${dotColor[key]} mr-1"></span>${key.charAt(0).toUpperCase() + key.slice(1)} (${counts[key]})
      </button>`
    }

    let rowsHtml = ""
    pageRows.forEach(row => {
      const mapped = row.mapped_data || {}
      const amount = parseFloat(mapped.amount) || 0
      const amtClass = amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
      const rowBg = {
        payment: "bg-red-50/50 dark:bg-red-900/10",
        deposit: "bg-green-50/50 dark:bg-green-900/10",
        transfer: "bg-blue-50/50 dark:bg-blue-900/10",
        skip: "bg-gray-50 dark:bg-gray-800/30",
      }[row.classification] || ""

      const selectBorder = {
        payment: "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30",
        deposit: "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30",
        transfer: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30",
        skip: "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800",
      }[row.classification] || ""

      rowsHtml += `<tr class="${rowBg}">
        <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">${escapeHtml(mapped.date || "")}</td>
        <td class="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(mapped.description || "")}</td>
        <td class="px-3 py-2 text-sm font-medium ${amtClass} text-right tabular-nums whitespace-nowrap">${formatCurrency(amount)}</td>
        <td class="px-3 py-2">
          <select id="si-classify-${row.id}" class="rounded text-xs px-2 py-1 ${selectBorder} dark:text-white focus:ring-brand-500 focus:border-brand-500"
                  data-action="change->smart-import#classificationChanged" data-row-id="${row.id}">
            <option value="payment" ${row.classification === "payment" ? "selected" : ""}>Payment</option>
            <option value="deposit" ${row.classification === "deposit" ? "selected" : ""}>Deposit</option>
            <option value="transfer" ${row.classification === "transfer" ? "selected" : ""}>Transfer</option>
            <option value="skip" ${row.classification === "skip" ? "selected" : ""}>Skip</option>
          </select>
        </td>
      </tr>`
    })

    this.phaseContainerTarget.innerHTML = `
      <div class="space-y-4 pb-4">
        <div class="text-center">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            How should we file each transaction?
            ${tooltipHtml("Each row needs to go somewhere — it's either a payment (money out), a deposit (money in), a transfer between your accounts, or something to skip.")}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">We auto-sorted <strong>${counts.all}</strong> transactions. Review and adjust if needed.</p>
        </div>

        <div class="flex flex-wrap gap-2">${tabsHtml}</div>

        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-left">
            <thead class="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Amount</th>
                <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase" style="width:130px">Type</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">${rowsHtml}</tbody>
          </table>
        </div>

        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Showing ${(this.classifyPage - 1) * this.classifyPerPage + 1}-${Math.min(this.classifyPage * this.classifyPerPage, filtered.length)} of ${filtered.length}</span>
          <div class="flex gap-1">
            <button class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 ${this.classifyPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}"
                    ${this.classifyPage <= 1 ? "disabled" : ""} data-action="click->smart-import#classifyPrev">Prev</button>
            <button class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 ${this.classifyPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}"
                    ${this.classifyPage >= totalPages ? "disabled" : ""} data-action="click->smart-import#classifyNext">Next</button>
          </div>
        </div>
      </div>
    `
  }

  classifyFilterAll() { this.classifyFilter = "all"; this.classifyPage = 1; this._saveClassifications(); this._renderStep3() }
  classifyFilter(e) {
    this._saveClassifications()
    this.classifyFilter = e.target.closest("[data-filter]")?.dataset.filter || "all"
    this.classifyPage = 1
    this._renderStep3()
  }
  classifyPrev() { if (this.classifyPage > 1) { this._saveClassifications(); this.classifyPage--; this._renderStep3() } }
  classifyNext() { this._saveClassifications(); this.classifyPage++; this._renderStep3() }

  classificationChanged(e) {
    const rowId = parseInt(e.target.dataset.rowId)
    const row = this.sessionRows.find(r => r.id === rowId)
    if (row) row.classification = e.target.value
  }

  async _submitClassifications() {
    this._saveClassifications()
    const classifications = {}
    this.sessionRows.forEach(r => { classifications[r.id] = r.classification })

    try {
      const res = await fetch(`${this.sessionsUrlValue}/${this.sessionId}/classify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue,
        },
        body: JSON.stringify({ classifications }),
      })

      if (res.ok) {
        this.step = 4
        this._renderStep()
      } else {
        const err = await res.json()
        alert(err.errors?.[0] || "Failed to save classifications.")
      }
    } catch (e) {
      alert("Network error. Please try again.")
      console.error(e)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Assign Fields
  // ═══════════════════════════════════════════════════════════════
  _renderStep4() {
    const payments = this.sessionRows.filter(r => r.classification === "payment")
    const deposits = this.sessionRows.filter(r => r.classification === "deposit")
    const transfers = this.sessionRows.filter(r => r.classification === "transfer")

    const catOptions = this.categories.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join("")

    const acctOptions = this.accounts.map(a =>
      `<option value="${a.id}">${escapeHtml(a.name)}</option>`
    ).join("")

    const selectedAccount = this.accounts.find(a => a.id === this._selectedAccountId)
    const selectedAccountName = selectedAccount ? selectedAccount.name : "Selected Account"

    let paymentsHtml = ""
    if (payments.length > 0) {
      let payRows = ""
      payments.forEach(row => {
        const m = row.mapped_data || {}
        const currentCat = row.assigned_data?.spending_category_id || ""
        payRows += `<tr>
          <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">${escapeHtml(m.date || "")}</td>
          <td class="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(m.description || "")}</td>
          <td class="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 text-right tabular-nums whitespace-nowrap">${formatCurrency(m.amount)}</td>
          <td class="px-3 py-2">
            <select class="w-full rounded text-xs px-2 py-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-brand-500"
                    data-assign-row="${row.id}" data-assign-field="spending_category_id">
              <option value="">Select category...</option>
              ${catOptions.replace(`value="${currentCat}"`, `value="${currentCat}" selected`)}
            </select>
          </td>
        </tr>`
      })

      const payTotal = payments.reduce((s, r) => s + Math.abs(parseFloat(r.mapped_data?.amount) || 0), 0)

      paymentsHtml = `
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full bg-red-500"></span>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Payments (${payments.length})</h3>
            <span class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium">${formatCurrency(payTotal)} total</span>
          </div>
          <div class="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg mb-3">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span class="text-xs font-medium text-red-800 dark:text-red-300">Set default category for all:</span>
              <div class="flex gap-2 items-center">
                <select id="si-bulk-cat" class="rounded text-xs px-2 py-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" style="width:180px">
                  <option value="">Select category...</option>
                  ${catOptions}
                </select>
                <button class="px-3 py-1 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition"
                        data-action="click->smart-import#bulkApplyCategory">Apply to All</button>
              </div>
            </div>
          </div>
          <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-left">
              <thead class="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Amount</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase" style="width:200px">Category <span class="text-red-500">*</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">${payRows}</tbody>
            </table>
          </div>
        </div>`
    }

    let depositsHtml = ""
    if (deposits.length > 0) {
      let depRows = ""
      deposits.forEach(row => {
        const m = row.mapped_data || {}
        const currentSrc = row.assigned_data?.source_name || m.description || ""
        depRows += `<tr>
          <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">${escapeHtml(m.date || "")}</td>
          <td class="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(m.description || "")}</td>
          <td class="px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 text-right tabular-nums whitespace-nowrap">${formatCurrency(m.amount)}</td>
          <td class="px-3 py-2">
            <input type="text" class="w-full rounded text-xs px-2 py-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-brand-500"
                   value="${escapeHtml(currentSrc)}" placeholder="Source name..."
                   data-assign-row="${row.id}" data-assign-field="source_name">
          </td>
        </tr>`
      })

      const depTotal = deposits.reduce((s, r) => s + Math.abs(parseFloat(r.mapped_data?.amount) || 0), 0)

      depositsHtml = `
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full bg-green-500"></span>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Deposits (${deposits.length})</h3>
            <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">${formatCurrency(depTotal)} total</span>
          </div>
          <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-left">
              <thead class="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Amount</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase" style="width:200px">Source Name <span class="text-red-500">*</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">${depRows}</tbody>
            </table>
          </div>
        </div>`
    }

    let transfersHtml = ""
    if (transfers.length > 0) {
      let xferRows = ""
      transfers.forEach(row => {
        const m = row.mapped_data || {}
        const currentAcct = row.assigned_data?.to_account_id || ""
        xferRows += `<tr>
          <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">${escapeHtml(m.date || "")}</td>
          <td class="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(m.description || "")}</td>
          <td class="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 text-right tabular-nums whitespace-nowrap">${formatCurrency(m.amount)}</td>
          <td class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">${escapeHtml(selectedAccountName)}</td>
          <td class="px-3 py-2">
            <select class="w-full rounded text-xs px-2 py-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-brand-500"
                    data-assign-row="${row.id}" data-assign-field="to_account_id">
              <option value="">Select account...</option>
              ${acctOptions.replace(`value="${currentAcct}"`, `value="${currentAcct}" selected`)}
            </select>
          </td>
        </tr>`
      })

      const xferTotal = transfers.reduce((s, r) => s + Math.abs(parseFloat(r.mapped_data?.amount) || 0), 0)

      transfersHtml = `
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Transfers (${transfers.length})</h3>
            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">${formatCurrency(xferTotal)} total</span>
          </div>
          <div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-3">
            <svg class="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div class="text-xs text-blue-800 dark:text-blue-300">Source account is <strong>${escapeHtml(selectedAccountName)}</strong>. Select the destination for each transfer.</div>
          </div>
          <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-left">
              <thead class="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Amount</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">From</th>
                  <th class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase" style="width:200px">To Account <span class="text-red-500">*</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">${xferRows}</tbody>
            </table>
          </div>
        </div>`
    }

    this.phaseContainerTarget.innerHTML = `
      <div class="space-y-2 pb-4">
        <div class="text-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            A few more details for each group
            ${tooltipHtml("Payments need a spending category so they show up in your budget reports. Deposits need a source name. Transfers need a destination account.")}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Assign the required fields for each transaction type.</p>
        </div>
        ${paymentsHtml}
        ${depositsHtml}
        ${transfersHtml}
      </div>
    `
  }

  bulkApplyCategory() {
    const catId = document.getElementById("si-bulk-cat")?.value
    if (!catId) { alert("Please select a category first."); return }
    const selects = this.phaseContainerTarget.querySelectorAll('[data-assign-field="spending_category_id"]')
    selects.forEach(sel => {
      if (!sel.value) sel.value = catId
    })
  }

  _validateStep4() {
    const payments = this.sessionRows.filter(r => r.classification === "payment")
    const transfers = this.sessionRows.filter(r => r.classification === "transfer")

    // Check all payments have a category
    for (const row of payments) {
      const sel = this.phaseContainerTarget.querySelector(`[data-assign-row="${row.id}"][data-assign-field="spending_category_id"]`)
      if (sel && !sel.value) {
        alert("Please assign a spending category to all payments.")
        return false
      }
    }

    // Check all transfers have a destination account
    for (const row of transfers) {
      const sel = this.phaseContainerTarget.querySelector(`[data-assign-row="${row.id}"][data-assign-field="to_account_id"]`)
      if (sel && !sel.value) {
        alert("Please select a destination account for all transfers.")
        return false
      }
    }

    return true
  }

  async _submitAssignments() {
    // Collect assignment data from DOM
    const assignments = {}
    this.sessionRows.forEach(row => {
      if (row.classification === "skip") return
      const data = {}
      const fields = this.phaseContainerTarget.querySelectorAll(`[data-assign-row="${row.id}"]`)
      fields.forEach(el => {
        const field = el.dataset.assignField
        const val = el.value
        if (val) data[field] = val
      })
      if (Object.keys(data).length > 0) {
        assignments[row.id] = data
        row.assigned_data = data
      }
    })

    try {
      // Submit assignments
      const res = await fetch(`${this.sessionsUrlValue}/${this.sessionId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue,
        },
        body: JSON.stringify({ assignments }),
      })

      if (res.ok) {
        // Run duplicate detection
        await fetch(`${this.sessionsUrlValue}/${this.sessionId}/duplicates`, {
          headers: { "Accept": "application/json" }
        })

        // Re-fetch session to get updated duplicate status
        const sessionRes = await fetch(`${this.sessionsUrlValue}/${this.sessionId}?per_page=500`, {
          headers: { "Accept": "application/json" }
        })
        if (sessionRes.ok) {
          const data = await sessionRes.json()
          this.sessionRows = data.rows || []
          this._sessionData = data
        }

        this.step = 5
        this._renderStep()
      } else {
        const err = await res.json()
        alert(err.errors?.[0] || "Failed to save assignments.")
      }
    } catch (e) {
      alert("Network error. Please try again.")
      console.error(e)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Confirm & Import
  // ═══════════════════════════════════════════════════════════════
  _renderStep5() {
    this._importState = this._importState || "ready" // ready, importing, complete

    const payments = this.sessionRows.filter(r => r.classification === "payment" && r.status !== "duplicate")
    const deposits = this.sessionRows.filter(r => r.classification === "deposit" && r.status !== "duplicate")
    const transfers = this.sessionRows.filter(r => r.classification === "transfer" && r.status !== "duplicate")
    const skipped = this.sessionRows.filter(r => r.classification === "skip")
    const duplicates = this.sessionRows.filter(r => r.status === "duplicate")

    const payTotal = payments.reduce((s, r) => s + Math.abs(parseFloat(r.mapped_data?.amount) || 0), 0)
    const depTotal = deposits.reduce((s, r) => s + Math.abs(parseFloat(r.mapped_data?.amount) || 0), 0)
    const xferTotal = transfers.reduce((s, r) => s + Math.abs(parseFloat(r.mapped_data?.amount) || 0), 0)
    const importCount = payments.length + deposits.length + transfers.length

    const summaryCards = `
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div class="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-center">
          <div class="text-2xl font-bold text-red-700 dark:text-red-300">${payments.length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Payments</div>
          <div class="text-xs font-semibold text-red-600 dark:text-red-400">${formatCurrency(payTotal)}</div>
        </div>
        <div class="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-center">
          <div class="text-2xl font-bold text-green-700 dark:text-green-300">${deposits.length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Deposits</div>
          <div class="text-xs font-semibold text-green-600 dark:text-green-400">${formatCurrency(depTotal)}</div>
        </div>
        <div class="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-center">
          <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">${transfers.length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Transfers</div>
          <div class="text-xs font-semibold text-blue-600 dark:text-blue-400">${formatCurrency(xferTotal)}</div>
        </div>
        <div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center">
          <div class="text-2xl font-bold text-gray-500 dark:text-gray-400">${skipped.length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Skipped</div>
          <div class="text-xs text-gray-400">&mdash;</div>
        </div>
        <div class="p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-center">
          <div class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">${duplicates.length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Duplicates</div>
          <div class="text-xs text-yellow-600 dark:text-yellow-400">won't import</div>
        </div>
      </div>
    `

    let duplicateWarning = ""
    if (duplicates.length > 0) {
      const dupList = duplicates.slice(0, 5).map(r => {
        const m = r.mapped_data || {}
        return `&bull; ${escapeHtml(m.description || "?")} &mdash; ${escapeHtml(m.date || "?")} &mdash; ${formatCurrency(m.amount)}`
      }).join("<br>")

      duplicateWarning = `
        <div class="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
          <svg class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <strong class="text-sm text-yellow-800 dark:text-yellow-300">${duplicates.length} duplicate(s) detected</strong>
            <span class="text-xs text-yellow-700 dark:text-yellow-400"> &mdash; these will <em>not</em> be imported:</span>
            <div class="text-xs text-yellow-700 dark:text-yellow-400 mt-1">${dupList}</div>
          </div>
        </div>`
    }

    let stateHtml = ""
    if (this._importState === "ready") {
      stateHtml = `
        <div class="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <svg class="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div class="text-sm text-green-800 dark:text-green-300"><strong>Ready to import ${importCount} transactions.</strong> Account balances will be updated automatically.</div>
        </div>
      `
    } else if (this._importState === "importing") {
      stateHtml = `
        <div class="text-center py-6">
          <div class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Importing transactions...</div>
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-md mx-auto">
            <div class="h-full bg-brand-600 rounded-full transition-all duration-300 animate-pulse" style="width:50%"></div>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">This may take a moment...</div>
        </div>
      `
    } else if (this._importState === "complete") {
      const result = this._importResult || {}
      stateHtml = `
        <div class="text-center py-6">
          <div class="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
            <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">Import Complete!</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <span class="text-green-600 font-semibold">${result.imported || 0} imported</span> &middot;
            <span class="text-yellow-600 font-semibold">${result.skipped || 0} skipped</span> &middot;
            <span class="text-red-600 font-semibold">${result.errors || 0} errors</span>
          </p>
        </div>

        <div class="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mt-4">
          <div class="flex items-center gap-2 mb-2">
            <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            <span class="text-sm font-semibold text-brand-800 dark:text-brand-300">Save this mapping as a template?</span>
          </div>
          <div class="flex gap-2 items-center">
            <input type="text" id="si-template-save-name" class="flex-1 rounded text-sm px-3 py-1.5 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-brand-500"
                   placeholder="Template name (e.g., Chase Checking CSV)..." value="${escapeHtml(this.fileName?.replace(/\.[^/.]+$/, '') || '')}">
            <button class="px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-brand-600 hover:bg-brand-700 transition"
                    data-action="click->smart-import#saveTemplate">Save</button>
            <button class="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    data-action="click->smart-import#goToDashboard">Done</button>
          </div>
        </div>
      `
    }

    this.phaseContainerTarget.innerHTML = `
      <div class="space-y-4 pb-4">
        <div class="text-center mb-2">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Everything look good? Let's import!
            ${tooltipHtml("Here's a summary of what will happen. Click Import to create all these records, or go back to make changes.")}
          </h2>
        </div>
        ${summaryCards}
        ${duplicateWarning}
        ${stateHtml}
      </div>
    `

    // Update footer buttons for step 5 state
    if (this._importState === "complete") {
      this.importBtnTarget.classList.add("hidden")
      this.backBtnTarget.classList.add("hidden")
    }
  }

  async executeImport() {
    this._importState = "importing"
    this._renderStep5()
    this.importBtnTarget.disabled = true
    this.importBtnTarget.classList.add("opacity-50")

    try {
      const res = await fetch(`${this.sessionsUrlValue}/${this.sessionId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue,
        },
      })

      if (res.ok) {
        const data = await res.json()
        this._importResult = data.result
        this._importState = "complete"
        this._renderStep5()
      } else {
        const err = await res.json()
        alert(err.errors?.[0] || "Import failed.")
        this._importState = "ready"
        this._renderStep5()
        this.importBtnTarget.disabled = false
        this.importBtnTarget.classList.remove("opacity-50")
      }
    } catch (e) {
      alert("Network error during import. Please try again.")
      this._importState = "ready"
      this._renderStep5()
      this.importBtnTarget.disabled = false
      this.importBtnTarget.classList.remove("opacity-50")
      console.error(e)
    }
  }

  async saveTemplate() {
    const name = document.getElementById("si-template-save-name")?.value?.trim()
    if (!name) { alert("Please enter a template name."); return }

    const sig = this.headers.length > 0 ? await this._generateSignature(this.headers) : null

    try {
      const res = await fetch(this.templatesUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue,
        },
        body: JSON.stringify({
          import_template: {
            name: name,
            file_type: this.fileType,
            column_signature: sig,
            column_mapping: this.columnMapping,
            default_account_id: this._selectedAccountId,
            amount_sign_convention: this.amountConvention,
            date_format: this.dateFormat,
          }
        }),
      })

      if (res.ok) {
        const btn = this.phaseContainerTarget.querySelector('[data-action="click->smart-import#saveTemplate"]')
        if (btn) {
          btn.textContent = "Saved!"
          btn.disabled = true
          btn.classList.add("opacity-50")
        }
      } else {
        const err = await res.json()
        alert(err.errors?.[0] || "Failed to save template.")
      }
    } catch (e) {
      alert("Network error. Please try again.")
      console.error(e)
    }
  }

  goToDashboard() {
    window.location.href = "/"
  }
}
