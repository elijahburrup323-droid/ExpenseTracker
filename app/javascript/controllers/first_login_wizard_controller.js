import { Controller } from "@hotwired/stimulus"

/**
 * First Login Wizard Controller
 *
 * Multi-step modal wizard shown when a user has zero accounts.
 * Cannot be dismissed (no ESC, no click-outside) until at least one account exists.
 *
 * Steps: Welcome → Select Type → Enter Details → Create → Add More or Finish
 */
export default class extends Controller {
  static targets = [
    "overlay", "step1", "step2", "step3", "step4",
    "typeBtn", "accountName", "startingBalance", "accountNote",
    "createBtn", "createError", "createdName", "createdBalance"
  ]
  static values = {
    createUrl: String,
    csrfToken: String,
    openMonth: String
  }

  connect() {
    this._selectedType = null
    this._selectedTypeId = null
    this._accountCount = 0
    this._showStep(1)

    // Block ESC key
    this._boundKeydown = this._blockEsc.bind(this)
    document.addEventListener("keydown", this._boundKeydown)
  }

  disconnect() {
    document.removeEventListener("keydown", this._boundKeydown)
  }

  _blockEsc(e) {
    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // Step 1 → Step 2
  toStep2() {
    this._showStep(2)
  }

  // Step 2: Select account type
  selectType(event) {
    const btn = event.currentTarget
    this._selectedType = btn.dataset.typeName
    this._selectedTypeId = btn.dataset.typeId

    // Update visual selection
    this.typeBtnTargets.forEach(b => {
      b.classList.remove("ring-2", "ring-brand-500", "border-brand-500", "bg-brand-50", "dark:bg-brand-900/20")
      b.classList.add("border-gray-200", "dark:border-gray-700")
    })
    btn.classList.add("ring-2", "ring-brand-500", "border-brand-500", "bg-brand-50", "dark:bg-brand-900/20")
    btn.classList.remove("border-gray-200", "dark:border-gray-700")

    // Auto-populate account name
    this.accountNameTarget.value = this._selectedType
    this._showStep(3)
    this.accountNameTarget.focus()
  }

  // Step 3: Create account
  async createAccount(event) {
    event.preventDefault()
    const name = this.accountNameTarget.value.trim()
    const balance = parseFloat(this.startingBalanceTarget.value) || 0
    const note = this.hasAccountNoteTarget ? this.accountNoteTarget.value.trim() : ""

    if (!name) {
      this._showCreateError("Please enter an account name.")
      return
    }

    this.createBtnTarget.disabled = true
    this.createBtnTarget.textContent = "Creating..."
    this._hideCreateError()

    try {
      const body = {
        account: {
          name: name,
          balance: balance,
          account_type_master_id: this._selectedTypeId,
          effective_date: this.openMonthValue,
          description: note
        }
      }

      const res = await fetch(this.createUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.csrfTokenValue
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (res.ok) {
        this._accountCount++
        this.createdNameTarget.textContent = name
        this.createdBalanceTarget.textContent = this._currency(balance)
        this._showStep(4)
      } else {
        const msg = data.errors ? data.errors.join(", ") : (data.error || "Failed to create account.")
        this._showCreateError(msg)
      }
    } catch (e) {
      this._showCreateError("Network error. Please try again.")
    } finally {
      this.createBtnTarget.disabled = false
      this.createBtnTarget.textContent = "Create Account"
    }
  }

  // Step 4: Add another account
  addAnother() {
    this._selectedType = null
    this._selectedTypeId = null
    this.accountNameTarget.value = ""
    this.startingBalanceTarget.value = ""
    if (this.hasAccountNoteTarget) this.accountNoteTarget.value = ""
    this.typeBtnTargets.forEach(b => {
      b.classList.remove("ring-2", "ring-brand-500", "border-brand-500", "bg-brand-50", "dark:bg-brand-900/20")
      b.classList.add("border-gray-200", "dark:border-gray-700")
    })
    this._showStep(2)
  }

  // Step 4: Finish setup — reload page to show dashboard
  finishSetup() {
    window.location.reload()
  }

  _showStep(n) {
    [this.step1Target, this.step2Target, this.step3Target, this.step4Target].forEach((el, i) => {
      el.classList.toggle("hidden", i + 1 !== n)
    })
  }

  _showCreateError(msg) {
    this.createErrorTarget.textContent = msg
    this.createErrorTarget.classList.remove("hidden")
  }

  _hideCreateError() {
    this.createErrorTarget.classList.add("hidden")
  }

  _currency(val) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0)
  }
}
