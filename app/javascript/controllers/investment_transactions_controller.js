import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "controllers/shared/icon_catalog"

const TRANSACTION_TYPES = ["BUY", "SELL", "DIVIDEND", "REINVEST", "FEE"]
const SHARE_TYPES = ["BUY", "SELL", "REINVEST"]
const AMOUNT_ONLY_TYPES = ["DIVIDEND", "FEE"]

export default class extends Controller {
  static targets = [
    "tableBody", "total", "holdingFilter",
    "formPanel", "formTitle", "formError", "formSaveBtn",
    "fieldType", "fieldHolding", "fieldDate", "fieldShares",
    "fieldPrice", "fieldAmount", "fieldFees", "fieldNotes",
    "sharesGroup", "priceGroup", "amountGroup",
    "realizedGainPreview", "realizedGainValue",
    "deleteModal", "deleteModalInfo"
  ]

  static values = {
    apiUrl: String,
    holdingsApiUrl: String,
    accountId: Number,
    holdingsBaseUrl: String,
    csrfToken: String
  }

  connect() {
    this.transactions = []
    this.holdings = []
    this.state = "idle"
    this.editingId = null
    this.deletingId = null
    this.sortField = "transaction_date"
    this.sortDir = "desc"
    this.filterHoldingId = ""
    this._fetchData()
  }

  async _fetchData() {
    try {
      const [txnRes, holdRes] = await Promise.all([
        fetch(`${this.apiUrlValue}?investment_account_id=${this.accountIdValue}`, { credentials: "same-origin" }),
        fetch(`${this.holdingsApiUrlValue}?investment_account_id=${this.accountIdValue}`, { credentials: "same-origin" })
      ])
      this.transactions = await txnRes.json()
      this.holdings = await holdRes.json()
      this._rebuildHoldingFilter()
      this._rebuildHoldingDropdown()
      this.renderTable()
    } catch (e) {
      this.tableBodyTarget.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-sm text-red-500">Failed to load transactions.</td></tr>`
    }
  }

  // ─── Sorting ────────────────────────────────────────────
  toggleSort(event) {
    const field = event.currentTarget.dataset.sortField
    if (this.sortField === field) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc"
    } else {
      this.sortField = field
      this.sortDir = "desc"
    }
    this._updateSortIcons()
    this.renderTable()
  }

  _getSorted() {
    let list = [...this.transactions]
    if (this.filterHoldingId) {
      list = list.filter(t => String(t.investment_holding_id) === String(this.filterHoldingId))
    }
    if (!this.sortField) return list
    const dir = this.sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      switch (this.sortField) {
        case "transaction_date":
          return ((a.transaction_date || "") < (b.transaction_date || "") ? -1 : 1) * dir
        case "transaction_type":
          return ((a.transaction_type || "") < (b.transaction_type || "") ? -1 : 1) * dir
        case "ticker_symbol":
          return ((a.ticker_symbol || "") < (b.ticker_symbol || "") ? -1 : 1) * dir
        case "shares":
          return (parseFloat(a.shares || 0) - parseFloat(b.shares || 0)) * dir
        case "price_per_share":
          return (parseFloat(a.price_per_share || 0) - parseFloat(b.price_per_share || 0)) * dir
        case "total_amount":
          return (parseFloat(a.total_amount || 0) - parseFloat(b.total_amount || 0)) * dir
        case "realized_gain":
          return (parseFloat(a.realized_gain || 0) - parseFloat(b.realized_gain || 0)) * dir
        default:
          return 0
      }
    })
    return list
  }

  _updateSortIcons() {
    this.element.querySelectorAll("[data-sort-icon]").forEach(el => {
      const field = el.dataset.sortIcon
      if (field === this.sortField) {
        el.textContent = this.sortDir === "asc" ? "▲" : "▼"
      } else {
        el.textContent = ""
      }
    })
  }

  // ─── Filtering ──────────────────────────────────────────
  filterByHolding() {
    this.filterHoldingId = this.holdingFilterTarget.value
    this.renderTable()
  }

  _rebuildHoldingFilter() {
    const dd = this.holdingFilterTarget
    dd.innerHTML = `<option value="">All Holdings</option>`
    for (const h of this.holdings) {
      dd.innerHTML += `<option value="${h.id}">${escapeHtml(h.ticker_symbol || h.security_name)}</option>`
    }
  }

  _rebuildHoldingDropdown() {
    if (!this.hasFieldHoldingTarget) return
    const dd = this.fieldHoldingTarget
    const current = dd.value
    dd.innerHTML = `<option value="">Select holding...</option>`
    for (const h of this.holdings) {
      dd.innerHTML += `<option value="${h.id}">${escapeHtml(h.ticker_symbol)} — ${escapeHtml(h.security_name)}</option>`
    }
    dd.value = current
  }

  // ─── Table Rendering ───────────────────────────────────
  renderTable() {
    const sorted = this._getSorted()
    if (sorted.length === 0) {
      const msg = this.transactions.length === 0
        ? "No transactions yet. Click <strong>Add Transaction</strong> to get started."
        : "No transactions match the selected filter."
      this.tableBodyTarget.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">${msg}</td></tr>`
    } else {
      this.tableBodyTarget.innerHTML = sorted.map(t => this._renderRow(t)).join("")
    }
    this._updateTotal(sorted)
    this._updateSortIcons()
  }

  _renderRow(t) {
    const date = t.transaction_date || "—"
    const type = t.transaction_type || ""
    const symbol = t.ticker_symbol || ""
    const shares = t.shares != null ? this._fmtNum(t.shares) : "—"
    const price = t.price_per_share != null ? this._fmt(t.price_per_share) : "—"
    const amount = this._fmt(t.total_amount)
    const rg = t.realized_gain != null && type === "SELL" ? t.realized_gain : null
    const rgFmt = rg != null ? this._fmt(rg) : "—"
    const rgColor = rg != null
      ? (rg >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
      : "text-gray-400"

    return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums whitespace-nowrap">${escapeHtml(date)}</td>
      <td class="px-4 py-3 text-sm">${this._typeBadge(type)}</td>
      <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(symbol)}</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-right tabular-nums">${shares}</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-right tabular-nums">${price}</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-right tabular-nums font-medium">${amount}</td>
      <td class="px-4 py-3 text-sm ${rgColor} text-right tabular-nums font-medium">${rgFmt}</td>
      <td class="px-4 py-3 text-right">
        <div class="flex items-center justify-end space-x-2">
          <button type="button" data-id="${t.id}" data-action="click->investment-transactions#startEditing"
                  class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">Edit</button>
          <button type="button" data-id="${t.id}" data-action="click->investment-transactions#confirmDelete"
                  class="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
        </div>
      </td>
    </tr>`
  }

  _updateTotal(sorted) {
    if (!this.hasTotalTarget) return
    const list = sorted || this._getSorted()
    this.totalTarget.textContent = `${list.length} transaction${list.length === 1 ? "" : "s"}`
  }

  _typeBadge(type) {
    const colors = {
      BUY: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      SELL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      DIVIDEND: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      REINVEST: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      FEE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      SPLIT: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
    const cls = colors[type] || colors.SPLIT
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}">${escapeHtml(type)}</span>`
  }

  // ─── Form: Add/Edit ────────────────────────────────────
  startAdding() {
    if (this.state !== "idle") return
    this.state = "adding"
    this.formTitleTarget.textContent = "Add Transaction"
    this._clearForm()
    this.fieldDateTarget.value = new Date().toISOString().slice(0, 10)
    this.formPanelTarget.classList.remove("hidden")
    this.formSaveBtnTarget.textContent = "Save Transaction"
    this._updateFieldVisibility()
    setTimeout(() => this.fieldTypeTarget.focus(), 50)
  }

  startEditing(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const txn = this.transactions.find(t => t.id === id)
    if (!txn) return

    this.state = "editing"
    this.editingId = id
    this.formTitleTarget.textContent = "Edit Transaction"

    this.fieldTypeTarget.value = txn.transaction_type
    this.fieldHoldingTarget.value = txn.investment_holding_id
    this.fieldDateTarget.value = txn.transaction_date || ""
    this.fieldSharesTarget.value = txn.shares != null ? txn.shares : ""
    this.fieldPriceTarget.value = txn.price_per_share != null ? txn.price_per_share : ""
    this.fieldAmountTarget.value = txn.total_amount != null ? txn.total_amount : ""
    this.fieldFeesTarget.value = txn.fees || 0
    this.fieldNotesTarget.value = txn.notes || ""

    this.formPanelTarget.classList.remove("hidden")
    this.formSaveBtnTarget.textContent = "Update Transaction"
    this._updateFieldVisibility()
  }

  cancelForm() {
    this.formPanelTarget.classList.add("hidden")
    this.state = "idle"
    this.editingId = null
    this._hideFormError()
    this._hideRealizedGainPreview()
  }

  typeChanged() {
    this._updateFieldVisibility()
    this._autoCalcAmount()
    this._previewRealizedGain()
  }

  fieldChanged() {
    this._autoCalcAmount()
    this._previewRealizedGain()
  }

  _updateFieldVisibility() {
    const type = this.fieldTypeTarget.value
    const isShareType = SHARE_TYPES.includes(type)
    const isAmountOnly = AMOUNT_ONLY_TYPES.includes(type)

    // Show/hide shares + price groups
    this.sharesGroupTarget.classList.toggle("hidden", !isShareType)
    this.priceGroupTarget.classList.toggle("hidden", !isShareType)

    // Amount: always visible, but for share types it's auto-calculated (readonly)
    this.fieldAmountTarget.readOnly = isShareType
    if (isShareType) {
      this.fieldAmountTarget.classList.add("bg-gray-100", "dark:bg-gray-600")
    } else {
      this.fieldAmountTarget.classList.remove("bg-gray-100", "dark:bg-gray-600")
    }

    // Clear irrelevant fields
    if (!isShareType) {
      this.fieldSharesTarget.value = ""
      this.fieldPriceTarget.value = ""
    }
    if (isShareType) {
      // auto-calc will fill amount
    }

    this._hideRealizedGainPreview()
    if (type === "SELL") this._previewRealizedGain()
  }

  _autoCalcAmount() {
    const type = this.fieldTypeTarget.value
    if (!SHARE_TYPES.includes(type)) return
    const shares = parseFloat(this.fieldSharesTarget.value) || 0
    const price = parseFloat(this.fieldPriceTarget.value) || 0
    this.fieldAmountTarget.value = (shares * price).toFixed(2)
  }

  async _previewRealizedGain() {
    if (this.fieldTypeTarget.value !== "SELL") {
      this._hideRealizedGainPreview()
      return
    }
    const holdingId = this.fieldHoldingTarget.value
    const shares = parseFloat(this.fieldSharesTarget.value) || 0
    const price = parseFloat(this.fieldPriceTarget.value) || 0
    if (!holdingId || shares <= 0 || price <= 0) {
      this._hideRealizedGainPreview()
      return
    }

    const holding = this.holdings.find(h => h.id === Number(holdingId))
    if (!holding) return

    // Estimate realized gain from the holding's average cost basis
    const avgCost = holding.shares_held > 0 ? holding.cost_basis / holding.shares_held : 0
    const estimatedCost = (shares * avgCost)
    const estimatedGain = (shares * price) - estimatedCost
    const color = estimatedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"

    this.realizedGainPreviewTarget.classList.remove("hidden")
    this.realizedGainValueTarget.innerHTML = `<span class="${color} font-bold">${this._fmt(estimatedGain)}</span> <span class="text-xs text-gray-500">(FIFO estimate — actual calculated on save)</span>`
  }

  _hideRealizedGainPreview() {
    if (this.hasRealizedGainPreviewTarget) {
      this.realizedGainPreviewTarget.classList.add("hidden")
    }
  }

  async saveForm() {
    this._hideFormError()
    const type = this.fieldTypeTarget.value
    const holdingId = this.fieldHoldingTarget.value
    const date = this.fieldDateTarget.value
    const shares = this.fieldSharesTarget.value ? parseFloat(this.fieldSharesTarget.value) : null
    const price = this.fieldPriceTarget.value ? parseFloat(this.fieldPriceTarget.value) : null
    const amount = this.fieldAmountTarget.value ? parseFloat(this.fieldAmountTarget.value) : null
    const fees = parseFloat(this.fieldFeesTarget.value) || 0
    const notes = this.fieldNotesTarget.value.trim()

    // Client-side validation
    if (!type) { this._showFormError("Transaction Type is required"); return }
    if (!holdingId) { this._showFormError("Holding is required"); return }
    if (!date) { this._showFormError("Trade Date is required"); return }
    if (SHARE_TYPES.includes(type)) {
      if (!shares || shares <= 0) { this._showFormError("Quantity must be greater than 0"); return }
      if (price == null || price < 0) { this._showFormError("Price must be 0 or greater"); return }
    }
    if (AMOUNT_ONLY_TYPES.includes(type)) {
      if (amount == null || amount < 0) { this._showFormError("Amount must be 0 or greater"); return }
    }

    const body = {
      investment_holding_id: holdingId,
      investment_transaction: {
        transaction_type: type,
        transaction_date: date,
        shares: SHARE_TYPES.includes(type) ? shares : null,
        price_per_share: SHARE_TYPES.includes(type) ? price : null,
        total_amount: amount,
        fees: fees,
        notes: notes || null
      }
    }

    this.formSaveBtnTarget.disabled = true
    this.formSaveBtnTarget.textContent = "Saving..."

    try {
      const isEdit = this.state === "editing"
      const url = isEdit ? `${this.apiUrlValue}/${this.editingId}` : this.apiUrlValue
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrfTokenValue },
        body: JSON.stringify(body)
      })

      if (res.ok || res.status === 201) {
        // Refetch all data to get updated holdings (shares, cost basis) and transactions
        this.cancelForm()
        await this._fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        this._showFormError(err.errors ? err.errors.join(", ") : "Save failed")
      }
    } catch (e) {
      this._showFormError("Network error — please try again")
    } finally {
      this.formSaveBtnTarget.disabled = false
      this.formSaveBtnTarget.textContent = this.state === "editing" ? "Update Transaction" : "Save Transaction"
    }
  }

  _clearForm() {
    this.fieldTypeTarget.value = ""
    this.fieldHoldingTarget.value = ""
    this.fieldDateTarget.value = ""
    this.fieldSharesTarget.value = ""
    this.fieldPriceTarget.value = ""
    this.fieldAmountTarget.value = ""
    this.fieldFeesTarget.value = "0"
    this.fieldNotesTarget.value = ""
    this._hideFormError()
    this._hideRealizedGainPreview()
  }

  _showFormError(msg) {
    this.formErrorTarget.textContent = msg
    this.formErrorTarget.classList.remove("hidden")
  }

  _hideFormError() {
    this.formErrorTarget.textContent = ""
    this.formErrorTarget.classList.add("hidden")
  }

  // ─── Delete ─────────────────────────────────────────────
  confirmDelete(event) {
    if (this.state !== "idle") return
    const id = Number(event.currentTarget.dataset.id)
    const txn = this.transactions.find(t => t.id === id)
    if (!txn) return

    this.deletingId = id
    this.deleteModalInfoTarget.textContent = `${txn.transaction_type} — ${txn.ticker_symbol || "Unknown"} — ${txn.transaction_date}`
    this.deleteModalTarget.classList.remove("hidden")
  }

  cancelDelete() {
    this.deleteModalTarget.classList.add("hidden")
    this.deletingId = null
  }

  async executeDelete() {
    this.deleteModalTarget.classList.add("hidden")
    try {
      const res = await fetch(`${this.apiUrlValue}/${this.deletingId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfTokenValue }
      })
      if (res.ok) {
        this.deletingId = null
        await this._fetchData()
      }
    } catch (e) {
      this.deletingId = null
    }
  }

  // ─── Helpers ────────────────────────────────────────────
  _fmt(val) {
    const num = parseFloat(val || 0)
    return num.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }

  _fmtNum(val) {
    const num = parseFloat(val || 0)
    // Use up to 6 decimal places for share quantities
    if (num === Math.floor(num)) return num.toLocaleString("en-US")
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  }
}
