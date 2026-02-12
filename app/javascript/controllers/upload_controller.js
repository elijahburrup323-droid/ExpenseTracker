import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    apiUrl: String,
    entity: String,
    fields: Array,
    lookups: Object,
    csrfToken: String
  }

  // --- lifecycle ---
  connect() {
    this.state = "idle"
    this.rows = []
    this.lookupData = {}
    this.importedCount = 0
    this.errorCount = 0
    this._templateFormat = localStorage.getItem("budgethq_template_format") || "csv"
  }

  // --- open / close ---
  open() {
    this.modal.classList.remove("hidden")
    this.showPhase("upload")
    this._restoreFormatRadio()
    document.body.style.overflow = "hidden"
  }

  close() {
    this.modal.classList.add("hidden")
    document.body.style.overflow = ""
    this.resetState()
  }

  get modal() { return this.element.querySelector("[data-upload-modal]") }

  // --- Format selection ---
  formatChanged(e) {
    this._templateFormat = e.target.value
    localStorage.setItem("budgethq_template_format", this._templateFormat)
  }

  _restoreFormatRadio() {
    const radios = this.element.querySelectorAll("[data-upload-format-radios] input[type='radio']")
    radios.forEach(r => { r.checked = r.value === this._templateFormat })
  }

  // --- Phase 1: template download (multi-format) ---
  downloadTemplate() {
    const fmt = this._templateFormat || "csv"
    switch (fmt) {
      case "excel":   this._downloadExcel(); break
      case "google_sheets": this._downloadGoogleSheets(); break
      case "numbers":  this._downloadNumbers(); break
      default:         this._downloadCSV(); break
    }
  }

  _downloadCSV() {
    const fields = this.fieldsValue
    const headers = fields.map(f => f.label)
    const csv = headers.join(",") + "\n"
    this._downloadBlob(new Blob([csv], { type: "text/csv" }), `${this.entityValue}_template.csv`)
  }

  _downloadExcel() {
    const fields = this.fieldsValue
    const headerCells = fields.map(f =>
      `<Cell ss:StyleID="header"><Data ss:Type="String">${this._escapeXml(f.label)}</Data></Cell>`
    ).join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Font ss:Size="11"/></Style>
  <Style ss:ID="header"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#D9E2F3" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${this._escapeXml(this.entityValue)}">
  <Table>
   ${fields.map(() => `<Column ss:AutoFitWidth="1" ss:Width="120"/>`).join("\n   ")}
   <Row>${headerCells}</Row>
  </Table>
 </Worksheet>
</Workbook>`

    this._downloadBlob(new Blob([xml], { type: "application/vnd.ms-excel" }), `${this.entityValue}_template.xls`)
  }

  _downloadGoogleSheets() {
    // Generate a TSV (tab-separated) — Google Sheets imports TSV cleanly via paste
    const fields = this.fieldsValue
    const headers = fields.map(f => f.label).join("\t") + "\n"
    this._downloadBlob(new Blob([headers], { type: "text/tab-separated-values" }), `${this.entityValue}_template.tsv`)
    // Also open a new blank Google Sheet so the user can import/paste
    window.open("https://sheets.google.com/create", "_blank")
  }

  _downloadNumbers() {
    // Apple Numbers opens CSV natively — generate a CSV with UTF-8 BOM for best compatibility
    const fields = this.fieldsValue
    const headers = fields.map(f => f.label)
    const bom = "\uFEFF"
    const csv = bom + headers.join(",") + "\n"
    this._downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${this.entityValue}_template.csv`)
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  _escapeXml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  // --- Phase 1: file selection ---
  fileSelected(e) {
    const file = e.target.files[0]
    if (!file) return
    this.showPhase("validating")
    const reader = new FileReader()
    reader.onload = (evt) => this.parseAndValidate(evt.target.result)
    reader.readAsText(file)
  }

  // --- CSV parser (handles quoted fields) ---
  parseCSV(text) {
    const rows = []
    let current = ""
    let inQuotes = false
    let row = []
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') {
          current += '"'; i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ",") {
          row.push(current.trim()); current = ""
        } else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++
          row.push(current.trim()); current = ""
          if (row.some(c => c !== "")) rows.push(row)
          row = []
        } else {
          current += ch
        }
      }
    }
    row.push(current.trim())
    if (row.some(c => c !== "")) rows.push(row)
    return rows
  }

  // --- Parse file + load lookups + validate ---
  async parseAndValidate(text) {
    const parsed = this.parseCSV(text)
    if (parsed.length < 2) {
      this.showError("File must have a header row and at least one data row.")
      this.showPhase("upload")
      return
    }

    const headers = parsed[0]
    const fields = this.fieldsValue

    // Map CSV columns to field keys by matching labels (case-insensitive)
    const colMap = []
    for (const field of fields) {
      const idx = headers.findIndex(h => h.toLowerCase() === field.label.toLowerCase())
      colMap.push(idx)
    }

    // Load lookup data for foreign key fields
    await this.loadLookups()

    // Build rows with validation
    this.rows = []
    for (let r = 1; r < parsed.length; r++) {
      const csvRow = parsed[r]
      const row = { values: {}, errors: {}, _raw: csvRow }
      for (let f = 0; f < fields.length; f++) {
        const field = fields[f]
        const val = colMap[f] >= 0 ? (csvRow[colMap[f]] || "") : ""
        row.values[field.key] = val
      }
      this.validateRow(row)
      this.rows.push(row)
    }

    this.renderGrid()
  }

  // --- Load lookup data ---
  async loadLookups() {
    const lookupUrls = this.lookupsValue || {}
    for (const [fieldKey, url] of Object.entries(lookupUrls)) {
      try {
        const resp = await fetch(url, { headers: { "Accept": "application/json" } })
        if (resp.ok) this.lookupData[fieldKey] = await resp.json()
      } catch (_) { /* ignore */ }
    }
  }

  // --- Resolve a lookup value (name → id) ---
  resolveLookup(fieldKey, lookupKey, value) {
    const data = this.lookupData[fieldKey]
    if (!data || !value) return null
    const lower = value.toLowerCase().trim()
    const match = data.find(item =>
      (item.name || item.quote_text || "").toLowerCase() === lower
    )
    return match ? match.id || match.frequency_master_id : null
  }

  getLookupOptions(fieldKey) {
    const data = this.lookupData[fieldKey]
    if (!data) return []
    return data.map(item => item.name || item.quote_text || "Unknown")
  }

  // --- Validate a single row ---
  validateRow(row) {
    row.errors = {}
    const fields = this.fieldsValue
    for (const field of fields) {
      const val = (row.values[field.key] || "").trim()

      // Required check
      if (field.required && !val) {
        row.errors[field.key] = `${field.label} is required`
        continue
      }
      if (!val) continue

      // Type-specific checks
      if (field.type === "number") {
        if (isNaN(parseFloat(val))) {
          row.errors[field.key] = `Must be a number`
        }
      }
      if (field.type === "date") {
        if (isNaN(Date.parse(val))) {
          row.errors[field.key] = `Must be a valid date (YYYY-MM-DD)`
        }
      }
      if (field.type === "boolean") {
        const b = val.toLowerCase()
        if (!["true", "false", "yes", "no", "1", "0"].includes(b)) {
          row.errors[field.key] = `Must be true/false, yes/no, or 1/0`
        }
      }
      if (field.type === "lookup" && field.lookupKey) {
        const resolved = this.resolveLookup(field.key, field.lookupKey, val)
        if (!resolved) {
          const options = this.getLookupOptions(field.key)
          row.errors[field.key] = `"${val}" not found. Options: ${options.join(", ")}`
        }
      }
      if (field.max && val.length > field.max) {
        row.errors[field.key] = `Max ${field.max} characters`
      }
    }
  }

  // --- Render the validation grid ---
  renderGrid() {
    this.showPhase("grid")
    const fields = this.fieldsValue
    const container = this.element.querySelector("[data-upload-grid]")
    const errorSummary = this.element.querySelector("[data-upload-error-summary]")
    const totalErrors = this.rows.reduce((sum, r) => sum + Object.keys(r.errors).length, 0)

    errorSummary.textContent = totalErrors > 0
      ? `${totalErrors} error${totalErrors > 1 ? "s" : ""} found — fix inline or remove rows before importing.`
      : "All rows valid — ready to import!"
    errorSummary.className = totalErrors > 0
      ? "text-sm font-medium text-red-600 dark:text-red-400 mb-3"
      : "text-sm font-medium text-green-600 dark:text-green-400 mb-3"

    let html = `<div class="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg"><table class="min-w-full text-sm"><thead class="bg-gray-50 dark:bg-gray-800 sticky top-0"><tr><th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-10">#</th>`
    for (const f of fields) {
      html += `<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${this.escapeHtml(f.label)}</th>`
    }
    html += `<th class="px-3 py-2 w-10"></th></tr></thead><tbody class="divide-y divide-gray-200 dark:divide-gray-700">`

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]
      const hasError = Object.keys(row.errors).length > 0
      html += `<tr class="${hasError ? "bg-red-50 dark:bg-red-900/10" : "bg-white dark:bg-gray-800"}">`
      html += `<td class="px-3 py-1.5 text-gray-400 text-xs">${i + 1}</td>`
      for (const f of fields) {
        const val = row.values[f.key] || ""
        const err = row.errors[f.key]
        const borderClass = err ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 dark:border-gray-600"

        if (f.type === "lookup") {
          const options = this.getLookupOptions(f.key)
          html += `<td class="px-2 py-1"><select data-row="${i}" data-field="${f.key}" data-action="change->upload#cellChanged" class="w-full text-sm rounded px-1.5 py-1 ${borderClass} bg-white dark:bg-gray-800 dark:text-gray-200" title="${err ? this.escapeHtml(err) : ""}">`
          html += `<option value="">-- select --</option>`
          for (const opt of options) {
            const sel = opt.toLowerCase() === val.toLowerCase() ? "selected" : ""
            html += `<option value="${this.escapeHtml(opt)}" ${sel}>${this.escapeHtml(opt)}</option>`
          }
          html += `</select></td>`
        } else if (f.type === "boolean") {
          const boolVal = ["true", "yes", "1"].includes((val || "").toLowerCase())
          html += `<td class="px-2 py-1"><select data-row="${i}" data-field="${f.key}" data-action="change->upload#cellChanged" class="w-full text-sm rounded px-1.5 py-1 ${borderClass} bg-white dark:bg-gray-800 dark:text-gray-200">`
          html += `<option value="true" ${boolVal ? "selected" : ""}>Yes</option>`
          html += `<option value="false" ${!boolVal && val ? "selected" : ""}>No</option>`
          if (!val) html += `<option value="" selected>-- select --</option>`
          html += `</select></td>`
        } else {
          html += `<td class="px-2 py-1"><input type="${f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}" value="${this.escapeHtml(val)}" data-row="${i}" data-field="${f.key}" data-action="change->upload#cellChanged" class="w-full text-sm rounded px-1.5 py-1 ${borderClass} bg-white dark:bg-gray-800 dark:text-gray-200" ${f.type === "number" ? 'step="0.01"' : ""} title="${err ? this.escapeHtml(err) : ""}"/></td>`
        }
      }
      html += `<td class="px-2 py-1"><button type="button" data-row="${i}" data-action="click->upload#removeRow" class="text-red-500 hover:text-red-700 text-xs font-bold" title="Remove row">&times;</button></td>`
      html += `</tr>`
    }

    html += `</tbody></table></div>`
    container.innerHTML = html

    // Enable/disable import button
    const btn = this.element.querySelector("[data-upload-import-btn]")
    if (btn) btn.disabled = this.rows.length === 0
  }

  // --- Cell edit handler ---
  cellChanged(e) {
    const rowIdx = parseInt(e.target.dataset.row)
    const fieldKey = e.target.dataset.field
    const row = this.rows[rowIdx]
    if (!row) return
    row.values[fieldKey] = e.target.value
    this.validateRow(row)
    this.renderGrid()
  }

  // --- Remove row ---
  removeRow(e) {
    const rowIdx = parseInt(e.target.dataset.row)
    this.rows.splice(rowIdx, 1)
    this.renderGrid()
  }

  // --- Phase 3: batch import ---
  async startImport() {
    if (this.rows.length === 0) return

    // Re-validate all rows
    for (const row of this.rows) this.validateRow(row)
    const hasErrors = this.rows.some(r => Object.keys(r.errors).length > 0)
    if (hasErrors) {
      this.renderGrid()
      return
    }

    this.showPhase("importing")
    this.importedCount = 0
    this.errorCount = 0
    const total = this.rows.length
    const fields = this.fieldsValue
    const progressBar = this.element.querySelector("[data-upload-progress-bar]")
    const progressText = this.element.querySelector("[data-upload-progress-text]")

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]
      const body = this.buildPayload(row, fields)

      try {
        const resp = await fetch(this.apiUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": this.csrfTokenValue
          },
          body: JSON.stringify(body)
        })
        if (resp.ok) {
          this.importedCount++
        } else {
          this.errorCount++
          const data = await resp.json().catch(() => ({}))
          row.errors._server = (data.errors || ["Server error"]).join(", ")
        }
      } catch (_) {
        this.errorCount++
        row.errors._server = "Network error"
      }

      // Update progress
      const pct = Math.round(((i + 1) / total) * 100)
      if (progressBar) progressBar.style.width = `${pct}%`
      if (progressText) progressText.textContent = `${i + 1} of ${total}`
    }

    this.showPhase("done")
    const summaryEl = this.element.querySelector("[data-upload-summary]")
    if (summaryEl) {
      summaryEl.innerHTML = this.errorCount === 0
        ? `<span class="text-green-600 dark:text-green-400 font-medium">Successfully imported all ${this.importedCount} row${this.importedCount !== 1 ? "s" : ""}!</span>`
        : `<span class="text-yellow-600 dark:text-yellow-400 font-medium">Imported ${this.importedCount} of ${total} rows. ${this.errorCount} error${this.errorCount !== 1 ? "s" : ""}.</span>`
    }
  }

  // --- Build the JSON payload for a row ---
  buildPayload(row, fields) {
    const body = {}
    for (const field of fields) {
      let val = (row.values[field.key] || "").trim()
      if (!val) continue

      if (field.type === "lookup" && field.lookupKey) {
        const id = this.resolveLookup(field.key, field.lookupKey, val)
        if (id) body[field.lookupKey] = id
      } else if (field.type === "number") {
        body[field.key] = parseFloat(val)
      } else if (field.type === "boolean") {
        body[field.key] = ["true", "yes", "1"].includes(val.toLowerCase())
      } else if (field.type === "date") {
        body[field.key] = val
      } else {
        body[field.key] = val
      }
    }
    // Wrap in entity key (e.g. { account: { name: ... } })
    const wrapper = {}
    wrapper[this.entityValue] = body
    return wrapper
  }

  // --- After done, close + refresh page data ---
  finishImport() {
    this.close()
    // Trigger a reload of the main data table via the parent controller
    const parentController = this.findParentController()
    if (parentController && typeof parentController.fetchAll === "function") {
      parentController.fetchAll()
    } else if (parentController && typeof parentController.loadData === "function") {
      parentController.loadData()
    } else {
      window.location.reload()
    }
  }

  findParentController() {
    // Walk up from our element to find the main page controller
    let el = this.element.parentElement
    while (el) {
      const controllers = (el.getAttribute("data-controller") || "").split(" ")
      for (const controllerId of controllers) {
        if (controllerId && controllerId !== "upload") {
          const ctrl = this.application.getControllerForElementAndIdentifier(el, controllerId)
          if (ctrl) return ctrl
        }
      }
      el = el.parentElement
    }
    return null
  }

  // --- Phase visibility helpers ---
  showPhase(phase) {
    this.state = phase
    const phases = ["upload", "grid", "importing", "done"]
    for (const p of phases) {
      const el = this.element.querySelector(`[data-upload-phase="${p}"]`)
      if (el) el.classList.toggle("hidden", p !== phase)
    }
    // Also show the validating spinner inside upload phase
    const spinner = this.element.querySelector("[data-upload-spinner]")
    if (spinner) spinner.classList.toggle("hidden", phase !== "validating")
    // Show/hide footer buttons
    const importBtn = this.element.querySelector("[data-upload-import-btn]")
    const doneBtn = this.element.querySelector("[data-upload-done-btn]")
    if (importBtn) importBtn.classList.toggle("hidden", phase !== "grid")
    if (doneBtn) doneBtn.classList.toggle("hidden", phase !== "done")
  }

  showError(msg) {
    const el = this.element.querySelector("[data-upload-file-error]")
    if (el) {
      el.textContent = msg
      el.classList.remove("hidden")
    }
  }

  resetState() {
    this.rows = []
    this.importedCount = 0
    this.errorCount = 0
    this.state = "idle"
    // Reset file input
    const fileInput = this.element.querySelector("[data-upload-file-input]")
    if (fileInput) fileInput.value = ""
    // Hide error
    const errEl = this.element.querySelector("[data-upload-file-error]")
    if (errEl) errEl.classList.add("hidden")
  }

  // --- Utility ---
  escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str || ""
    return div.innerHTML
  }
}
