import { Controller } from "@hotwired/stimulus"

// SSA 2022 Period Life Table (abridged: age -> remaining years)
const LIFE_TABLE_MALE = {
  62:20.3,63:19.5,64:18.7,65:17.9,66:17.2,67:16.5,68:15.7,69:15.0,70:14.3,71:13.6,72:12.9,73:12.3,74:11.6,75:11.0,76:10.4,77:9.8,78:9.2,79:8.6,80:8.1,81:7.6,82:7.1,83:6.6,84:6.1,85:5.7,86:5.3,87:4.9,88:4.6,89:4.3,90:4.0
}
const LIFE_TABLE_FEMALE = {
  62:23.0,63:22.1,64:21.3,65:20.4,66:19.6,67:18.8,68:18.0,69:17.2,70:16.4,71:15.6,72:14.9,73:14.1,74:13.4,75:12.7,76:12.0,77:11.3,78:10.6,79:10.0,80:9.4,81:8.8,82:8.2,83:7.6,84:7.1,85:6.6,86:6.1,87:5.7,88:5.3,89:4.9,90:4.5
}

// Chart line colors
const LINE_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1"]

// Full Retirement Age (FRA) by birth year
function getFRA(birthYear) {
  if (birthYear <= 1937) return { years: 65, months: 0 }
  if (birthYear === 1938) return { years: 65, months: 2 }
  if (birthYear === 1939) return { years: 65, months: 4 }
  if (birthYear === 1940) return { years: 65, months: 6 }
  if (birthYear === 1941) return { years: 65, months: 8 }
  if (birthYear === 1942) return { years: 65, months: 10 }
  if (birthYear >= 1943 && birthYear <= 1954) return { years: 66, months: 0 }
  if (birthYear === 1955) return { years: 66, months: 2 }
  if (birthYear === 1956) return { years: 66, months: 4 }
  if (birthYear === 1957) return { years: 66, months: 6 }
  if (birthYear === 1958) return { years: 66, months: 8 }
  if (birthYear === 1959) return { years: 66, months: 10 }
  return { years: 67, months: 0 } // 1960+
}

// Early/late claiming adjustment factor (month precision)
function claimingFactor(claimAgeMonths, fraMonths) {
  const diff = claimAgeMonths - fraMonths
  if (diff === 0) return 1.0
  if (diff < 0) {
    const earlyMonths = Math.abs(diff)
    let reduction = 0
    if (earlyMonths <= 36) {
      reduction = earlyMonths * (5 / 900)
    } else {
      reduction = 36 * (5 / 900) + (earlyMonths - 36) * (5 / 1200)
    }
    return 1.0 - reduction
  }
  const delayedMonths = Math.min(diff, (70 * 12) - fraMonths)
  return 1.0 + delayedMonths * (2 / 300)
}

function lifeExpectancy(age, sex) {
  const table = sex === "male" ? LIFE_TABLE_MALE : LIFE_TABLE_FEMALE
  const rounded = Math.max(62, Math.min(90, Math.round(age)))
  return (table[rounded] || 15) + rounded
}

function fmtAge(years, months) {
  return `${years} years and ${months} months`
}

function fmtCurrency(val) {
  return `$${Math.round(val).toLocaleString()}`
}

export default class extends Controller {
  static targets = [
    "yourName", "yourSex", "yourBirthdate", "yourCurrentlyDrawing",
    "yourClaimAgeList", "yourClaimAgeDupMsg", "yourFRA", "yourFRAInline", "yourLifeExpectancy",
    "yourPIA",
    "spouseSection", "spouseName", "spouseSex", "spouseBirthdate", "spouseCurrentlyDrawing",
    "spouseClaimAgeList", "spouseClaimAgeDupMsg", "spouseFRA", "spouseFRAInline", "spouseLifeExpectancy",
    "spousePIA",
    "colaRate",
    "strategyTableBody", "strategyTableHead", "timelineChart",
    "yourOptimal", "spouseOptimal", "projectedValue",
    "assumptionsSection", "workingBeforeFRA",
    "recommendationText", "recommendationSection",
    "spouseEmptyState", "spouseCard", "chartLegend",
    "compareBtn", "compareSpinner",
    "breakEvenSection", "breakEvenBody"
  ]

  connect() {
    this.hasSpouse = false
    this.sortField = null
    this.sortDir = "asc"
    this._lastStrategies = []
    this._breakEvens = []

    // Initialize claim age lists with defaults
    this.yourClaimAges = [{ years: 62, months: 0 }, { years: 67, months: 0 }]
    this.spouseClaimAges = [{ years: 62, months: 0 }, { years: 67, months: 0 }]

    this._renderClaimAgeRows("your")
    this._renderClaimAgeRows("spouse")
    this._updateFRAandLE()
  }

  // ─── Actions ────────────────────────────────────────

  scrollToAssumptions() {
    if (this.hasAssumptionsSectionTarget) {
      this.assumptionsSectionTarget.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  toggleSpouse() {
    this.hasSpouse = !this.hasSpouse
    if (this.hasSpouse) {
      this.spouseSectionTarget.classList.remove("hidden")
      if (this.hasSpouseEmptyStateTarget) this.spouseEmptyStateTarget.classList.add("hidden")
      if (this.hasSpouseCardTarget) {
        this.spouseCardTarget.classList.remove("border-2", "border-dashed", "border-gray-300", "dark:border-gray-600")
        this.spouseCardTarget.classList.add("bg-white", "dark:bg-gray-800", "shadow-sm", "ring-1", "ring-gray-200", "dark:ring-gray-700")
      }
    } else {
      this.spouseSectionTarget.classList.add("hidden")
      if (this.hasSpouseEmptyStateTarget) this.spouseEmptyStateTarget.classList.remove("hidden")
      if (this.hasSpouseCardTarget) {
        this.spouseCardTarget.classList.add("border-2", "border-dashed", "border-gray-300", "dark:border-gray-600")
        this.spouseCardTarget.classList.remove("bg-white", "dark:bg-gray-800", "shadow-sm", "ring-1", "ring-gray-200", "dark:ring-gray-700")
      }
    }
  }

  recalculate() {
    this._updateFRAandLE()
  }

  compareClaimAges() {
    this._runComparison()
  }

  resetScenario() {
    if (this.hasYourNameTarget) this.yourNameTarget.value = ""
    if (this.hasYourBirthdateTarget) this.yourBirthdateTarget.value = ""
    if (this.hasYourPIATarget) this.yourPIATarget.value = ""
    if (this.hasColaRateTarget) this.colaRateTarget.value = "2.6"
    if (this.hasWorkingBeforeFRATarget) this.workingBeforeFRATarget.value = "no"
    this.hasSpouse = false
    if (this.hasSpouseSectionTarget) this.spouseSectionTarget.classList.add("hidden")
    if (this.hasSpouseEmptyStateTarget) this.spouseEmptyStateTarget.classList.remove("hidden")
    if (this.hasSpouseCardTarget) {
      this.spouseCardTarget.classList.add("border-2", "border-dashed", "border-gray-300", "dark:border-gray-600")
      this.spouseCardTarget.classList.remove("bg-white", "dark:bg-gray-800", "shadow-sm", "ring-1", "ring-gray-200", "dark:ring-gray-700")
    }
    if (this.hasRecommendationTextTarget) {
      this.recommendationTextTarget.textContent = "Enter your details above to receive a personalized recommendation."
    }
    if (this.hasChartLegendTarget) this.chartLegendTarget.classList.add("hidden")
    this.sortField = null
    this.sortDir = "asc"
    this._lastStrategies = []
    this._breakEvens = []

    this.yourClaimAges = [{ years: 62, months: 0 }, { years: 67, months: 0 }]
    this.spouseClaimAges = [{ years: 62, months: 0 }, { years: 67, months: 0 }]
    this._renderClaimAgeRows("your")
    this._renderClaimAgeRows("spouse")

    // Reset displays
    if (this.hasYourFRATarget) this.yourFRATarget.innerHTML = "&mdash;"
    if (this.hasYourLifeExpectancyTarget) this.yourLifeExpectancyTarget.innerHTML = "&mdash;"
    if (this.hasYourOptimalTarget) this.yourOptimalTarget.innerHTML = "&mdash;"
    if (this.hasSpouseOptimalTarget) this.spouseOptimalTarget.innerHTML = "&mdash;"
    if (this.hasProjectedValueTarget) this.projectedValueTarget.innerHTML = "&mdash;"
    if (this.hasStrategyTableBodyTarget) {
      this.strategyTableBodyTarget.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-gray-400">Enter your PIA and birthdate, then click Calculate Comparison.</td></tr>'
    }
    if (this.hasTimelineChartTarget) {
      this.timelineChartTarget.innerHTML = '<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Enter your details above to see the comparison chart.</p>'
    }
    if (this.hasBreakEvenBodyTarget) {
      this.breakEvenBodyTarget.innerHTML = '<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Click Calculate Comparison to see break-even ages.</p>'
    }
  }

  // ─── Claim Age List Management ────────────────────

  addYourClaimAge() {
    this._addClaimAge("your")
  }

  addSpouseClaimAge() {
    this._addClaimAge("spouse")
  }

  _addClaimAge(who) {
    const ages = who === "your" ? this.yourClaimAges : this.spouseClaimAges
    // Find a default that doesn't duplicate
    let newAge = { years: 62, months: 0 }
    for (let y = 62; y <= 70; y++) {
      if (!ages.some(a => a.years === y && a.months === 0)) {
        newAge = { years: y, months: 0 }
        break
      }
    }
    ages.push(newAge)
    this._renderClaimAgeRows(who)
    this._validateDuplicates(who)
  }

  _removeClaimAge(who, index) {
    const ages = who === "your" ? this.yourClaimAges : this.spouseClaimAges
    if (ages.length <= 2) return
    ages.splice(index, 1)
    this._renderClaimAgeRows(who)
    this._validateDuplicates(who)
  }

  _onClaimAgeChange(who, index, field, value) {
    const ages = who === "your" ? this.yourClaimAges : this.spouseClaimAges
    ages[index][field] = parseInt(value) || 0
    this._validateDuplicates(who)
  }

  _validateDuplicates(who) {
    const ages = who === "your" ? this.yourClaimAges : this.spouseClaimAges
    const dupTarget = who === "your" ? this.yourClaimAgeDupMsgTarget : this.spouseClaimAgeDupMsgTarget
    const seen = new Set()
    let hasDup = false
    for (const a of ages) {
      const key = `${a.years}-${a.months}`
      if (seen.has(key)) { hasDup = true; break }
      seen.add(key)
    }
    if (hasDup) {
      dupTarget.classList.remove("hidden")
    } else {
      dupTarget.classList.add("hidden")
    }
    return hasDup
  }

  _renderClaimAgeRows(who) {
    const ages = who === "your" ? this.yourClaimAges : this.spouseClaimAges
    const container = who === "your" ? this.yourClaimAgeListTarget : this.spouseClaimAgeListTarget
    const selectClass = "rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-brand-500 focus:border-brand-500 px-2 py-1.5"

    // Table header row
    let html = `<div class="grid grid-cols-[1fr_1fr_auto] gap-2 mb-1">
      <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Years</span>
      <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Months</span>
      <span class="w-8"></span>
    </div>`

    html += ages.map((age, idx) => {
      const yearsOpts = Array.from({ length: 9 }, (_, i) => {
        const y = 62 + i
        return `<option value="${y}" ${y === age.years ? "selected" : ""}>${y}</option>`
      }).join("")
      const monthsOpts = Array.from({ length: 12 }, (_, i) => {
        return `<option value="${i}" ${i === age.months ? "selected" : ""}>${i}</option>`
      }).join("")
      const canDelete = ages.length > 2
      const deleteBtn = canDelete
        ? `<button type="button" data-claim-who="${who}" data-claim-idx="${idx}" data-action="click->ss-planner#removeClaimAgeRow"
             class="p-1.5 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 transition" title="Remove">
             <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
           </button>`
        : `<div class="w-8"></div>`
      return `<div class="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
        <select data-claim-who="${who}" data-claim-idx="${idx}" data-claim-field="years"
                data-action="change->ss-planner#onClaimAgeSelect"
                class="${selectClass}">${yearsOpts}</select>
        <select data-claim-who="${who}" data-claim-idx="${idx}" data-claim-field="months"
                data-action="change->ss-planner#onClaimAgeSelect"
                class="${selectClass}">${monthsOpts}</select>
        ${deleteBtn}
      </div>`
    }).join("")

    container.innerHTML = html
  }

  // Stimulus action handlers for dynamic rows
  onClaimAgeSelect(event) {
    const el = event.currentTarget
    const who = el.dataset.claimWho
    const idx = parseInt(el.dataset.claimIdx)
    const field = el.dataset.claimField
    this._onClaimAgeChange(who, idx, field, el.value)
  }

  removeClaimAgeRow(event) {
    const el = event.currentTarget
    const who = el.dataset.claimWho
    const idx = parseInt(el.dataset.claimIdx)
    this._removeClaimAge(who, idx)
  }

  // ─── FRA / Life Expectancy (live update on input change) ──

  _updateFRAandLE() {
    const yourBirth = this.hasYourBirthdateTarget ? this.yourBirthdateTarget.value : ""
    const yourSex = this.hasYourSexTarget ? this.yourSexTarget.value : "male"

    if (yourBirth) {
      const birthDate = new Date(yourBirth)
      const birthYear = birthDate.getFullYear()
      const fra = getFRA(birthYear)
      const yourFRAText = fmtAge(fra.years, fra.months)
      if (this.hasYourFRATarget) {
        this.yourFRATarget.textContent = yourFRAText
      }
      if (this.hasYourFRAInlineTarget) {
        this.yourFRAInlineTarget.textContent = yourFRAText
      }
      const now = new Date()
      const ageYears = now.getFullYear() - birthYear - (now < new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
      const le = lifeExpectancy(ageYears, yourSex)
      if (this.hasYourLifeExpectancyTarget) {
        this.yourLifeExpectancyTarget.textContent = `${Math.round(le)} Years`
      }
    }

    if (this.hasSpouse) {
      const spouseBirth = this.hasSpouseBirthdateTarget ? this.spouseBirthdateTarget.value : ""
      const spouseSex = this.hasSpouseSexTarget ? this.spouseSexTarget.value : "female"
      if (spouseBirth) {
        const sBirth = new Date(spouseBirth)
        const sBirthYear = sBirth.getFullYear()
        const sFra = getFRA(sBirthYear)
        const spouseFRAText = fmtAge(sFra.years, sFra.months)
        if (this.hasSpouseFRATarget) {
          this.spouseFRATarget.textContent = spouseFRAText
        }
        if (this.hasSpouseFRAInlineTarget) {
          this.spouseFRAInlineTarget.textContent = spouseFRAText
        }
        const now = new Date()
        const sAge = now.getFullYear() - sBirthYear - (now < new Date(now.getFullYear(), sBirth.getMonth(), sBirth.getDate()) ? 1 : 0)
        const sLe = lifeExpectancy(sAge, spouseSex)
        if (this.hasSpouseLifeExpectancyTarget) {
          this.spouseLifeExpectancyTarget.textContent = `${Math.round(sLe)} Years`
        }
      }
    }
  }

  // ─── Sorting (CM-13 pattern) ────────────────────────

  toggleSort(event) {
    const field = event.currentTarget.dataset.sortField
    if (!field) return
    if (this.sortField === field) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc"
    } else {
      this.sortField = field
      this.sortDir = "asc"
    }
    this._updateSortIcons()
    this._renderSortedTable()
  }

  _updateSortIcons() {
    if (!this.hasStrategyTableHeadTarget) return
    const icons = this.strategyTableHeadTarget.querySelectorAll("[data-sort-icon]")
    icons.forEach(icon => {
      const field = icon.dataset.sortIcon
      if (field === this.sortField) {
        icon.innerHTML = this.sortDir === "asc"
          ? '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>'
          : '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>'
        icon.className = "text-brand-600 dark:text-brand-400"
      } else {
        icon.innerHTML = ""
        icon.className = "text-gray-300 dark:text-gray-600"
      }
    })
  }

  _renderSortedTable() {
    if (!this._lastStrategies || this._lastStrategies.length === 0) return
    const sorted = this._getSortedStrategies(this._lastStrategies)
    this._renderStrategyTable(sorted)
  }

  _getSortedStrategies(strategies) {
    if (!this.sortField) return [...strategies]
    const dir = this.sortDir === "asc" ? 1 : -1
    const sorted = [...strategies]
    sorted.sort((a, b) => {
      let valA, valB
      switch (this.sortField) {
        case "claimAge":
          valA = a.claimYears * 12 + a.claimMonths
          valB = b.claimYears * 12 + b.claimMonths
          return (valA - valB) * dir
        case "monthlyBenefit":
          valA = a.monthlyBenefit || 0
          valB = b.monthlyBenefit || 0
          return (valA - valB) * dir
        case "lifetime":
          valA = a.lifetime || 0
          valB = b.lifetime || 0
          return (valA - valB) * dir
        default:
          return 0
      }
    })
    return sorted
  }

  // ─── Core Comparison ─────────────────────────────────

  _runComparison() {
    // Show spinner
    if (this.hasCompareBtnTarget) this.compareBtnTarget.disabled = true
    if (this.hasCompareSpinnerTarget) this.compareSpinnerTarget.classList.remove("hidden")

    // Use setTimeout to allow spinner to render before computation
    setTimeout(() => {
      try {
        this._doComparison()
      } finally {
        if (this.hasCompareBtnTarget) this.compareBtnTarget.disabled = false
        if (this.hasCompareSpinnerTarget) this.compareSpinnerTarget.classList.add("hidden")
      }
    }, 50)
  }

  _doComparison() {
    this._updateFRAandLE()

    const yourBirth = this.hasYourBirthdateTarget ? this.yourBirthdateTarget.value : ""
    const yourSex = this.hasYourSexTarget ? this.yourSexTarget.value : "male"
    const yourPIA = this.hasYourPIATarget ? parseFloat(this.yourPIATarget.value) || 0 : 0
    const cola = this.hasColaRateTarget ? parseFloat(this.colaRateTarget.value) || 2.6 : 2.6
    const workingBeforeFRA = this.hasWorkingBeforeFRATarget ? this.workingBeforeFRATarget.value === "yes" : false

    if (!yourBirth || yourPIA <= 0) {
      if (this.hasRecommendationTextTarget) {
        this.recommendationTextTarget.textContent = "Please enter your birthdate and PIA to run a comparison."
      }
      return
    }

    // Check for duplicates
    if (this._validateDuplicates("your")) return

    const birthDate = new Date(yourBirth)
    const birthYear = birthDate.getFullYear()
    const fra = getFRA(birthYear)
    const fraMonths = fra.years * 12 + fra.months
    const now = new Date()
    const ageYears = now.getFullYear() - birthYear - (now < new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
    const le = lifeExpectancy(ageYears, yourSex)

    // Sort claim ages ascending
    const sortedAges = [...this.yourClaimAges].sort((a, b) => (a.years * 12 + a.months) - (b.years * 12 + b.months))

    // Compute strategies for each claim age (with year+month precision)
    const strategies = sortedAges.map(age => {
      const totalClaimMonths = age.years * 12 + age.months
      const factor = claimingFactor(totalClaimMonths, fraMonths)
      let monthlyBenefit = yourPIA * factor

      if (workingBeforeFRA && totalClaimMonths < fraMonths) {
        monthlyBenefit *= 0.5
      }

      // Compute lifetime value month-by-month with COLA
      const claimAgeDecimal = age.years + age.months / 12
      const monthsCollecting = Math.max(0, Math.round((le - claimAgeDecimal) * 12))
      let lifetime = 0
      for (let m = 0; m < monthsCollecting; m++) {
        const yearIdx = Math.floor(m / 12)
        lifetime += monthlyBenefit * Math.pow(1 + cola / 100, yearIdx)
      }

      // Note about FRA relationship
      let note = ""
      if (totalClaimMonths < fraMonths) {
        const pct = ((1 - factor) * 100).toFixed(1)
        note = `${pct}% reduction (early)`
      } else if (totalClaimMonths > fraMonths) {
        const pct = ((factor - 1) * 100).toFixed(1)
        note = `${pct}% increase (delayed)`
      } else {
        note = "Full Retirement Age"
      }

      return {
        claimYears: age.years,
        claimMonths: age.months,
        totalClaimMonths,
        factor,
        monthlyBenefit: Math.round(monthlyBenefit),
        lifetime: Math.round(lifetime),
        note
      }
    })

    // Compute pairwise break-evens (each pair: earlier vs later)
    const breakEvens = []
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const earlier = strategies[i]
        const later = strategies[j]
        const be = this._computeBreakEven(earlier, later, cola)
        breakEvens.push(be)
      }
    }

    // Cache for sorting
    this._lastStrategies = [...strategies]
    this._breakEvens = breakEvens

    // Render
    const displayStrategies = this.sortField ? this._getSortedStrategies(this._lastStrategies) : this._lastStrategies
    this._renderStrategyTable(displayStrategies)
    this._updateSortIcons()

    // Optimal
    const best = strategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b)
    if (this.hasYourOptimalTarget) {
      this.yourOptimalTarget.textContent = fmtAge(best.claimYears, best.claimMonths)
    }

    // Spouse (if present, find best for spouse too)
    if (this.hasSpouse) {
      const spouseBirth = this.hasSpouseBirthdateTarget ? this.spouseBirthdateTarget.value : ""
      const spouseSex = this.hasSpouseSexTarget ? this.spouseSexTarget.value : "female"
      const spousePIA = this.hasSpousePIATarget ? parseFloat(this.spousePIATarget.value) || 0 : 0
      if (spouseBirth && spousePIA > 0 && !this._validateDuplicates("spouse")) {
        const sBirth = new Date(spouseBirth)
        const sBirthYear = sBirth.getFullYear()
        const sFra = getFRA(sBirthYear)
        const sFraMonths = sFra.years * 12 + sFra.months
        const sAge = now.getFullYear() - sBirthYear - (now < new Date(now.getFullYear(), sBirth.getMonth(), sBirth.getDate()) ? 1 : 0)
        const sLe = lifeExpectancy(sAge, spouseSex)
        const sortedSpouseAges = [...this.spouseClaimAges].sort((a, b) => (a.years * 12 + a.months) - (b.years * 12 + b.months))
        const spouseStrats = sortedSpouseAges.map(age => {
          const totalClaimMonths = age.years * 12 + age.months
          const factor = claimingFactor(totalClaimMonths, sFraMonths)
          let mb = spousePIA * factor
          if (workingBeforeFRA && totalClaimMonths < sFraMonths) mb *= 0.5
          const claimAgeDecimal = age.years + age.months / 12
          const mc = Math.max(0, Math.round((sLe - claimAgeDecimal) * 12))
          let lt = 0
          for (let m = 0; m < mc; m++) lt += mb * Math.pow(1 + cola / 100, Math.floor(m / 12))
          return { claimYears: age.years, claimMonths: age.months, monthlyBenefit: Math.round(mb), lifetime: Math.round(lt) }
        })
        const sBest = spouseStrats.reduce((a, b) => a.lifetime > b.lifetime ? a : b)
        if (this.hasSpouseOptimalTarget) {
          this.spouseOptimalTarget.textContent = fmtAge(sBest.claimYears, sBest.claimMonths)
        }
        const totalLifetime = best.lifetime + sBest.lifetime
        if (this.hasProjectedValueTarget) {
          this.projectedValueTarget.textContent = fmtCurrency(totalLifetime)
        }
      }
    } else {
      if (this.hasSpouseOptimalTarget) this.spouseOptimalTarget.innerHTML = "&mdash;"
      if (this.hasProjectedValueTarget) {
        this.projectedValueTarget.textContent = fmtCurrency(best.lifetime)
      }
    }

    // Chart
    this._renderLineChart(strategies, cola)

    // Break-even
    this._renderBreakEven(breakEvens)

    // Recommendation / narrative
    this._generateRecommendation(best, strategies, breakEvens)
  }

  _computeBreakEven(earlier, later, colaRate) {
    // Simulate month-by-month cumulative from the earliest claim start to age 100
    const startMonth = earlier.totalClaimMonths // earlier starts first
    const endMonth = 100 * 12 // age 100 as safe cap

    let cumEarlier = 0
    let cumLater = 0
    let breakEvenMonth = null

    for (let m = startMonth; m <= endMonth; m++) {
      // Earlier strategy: collecting from its claim age
      if (m >= earlier.totalClaimMonths) {
        const monthsDrawn = m - earlier.totalClaimMonths
        const yearIdx = Math.floor(monthsDrawn / 12)
        cumEarlier += earlier.monthlyBenefit * Math.pow(1 + colaRate / 100, yearIdx)
      }
      // Later strategy: collecting from its claim age
      if (m >= later.totalClaimMonths) {
        const monthsDrawn = m - later.totalClaimMonths
        const yearIdx = Math.floor(monthsDrawn / 12)
        cumLater += later.monthlyBenefit * Math.pow(1 + colaRate / 100, yearIdx)
      }
      // Check crossover
      if (breakEvenMonth === null && cumLater > cumEarlier) {
        breakEvenMonth = m
      }
    }

    const beYears = breakEvenMonth ? Math.floor(breakEvenMonth / 12) : null
    const beMonths = breakEvenMonth ? breakEvenMonth % 12 : null

    return {
      earlier: { years: earlier.claimYears, months: earlier.claimMonths },
      later: { years: later.claimYears, months: later.claimMonths },
      breakEvenYears: beYears,
      breakEvenMonths: beMonths,
      breakEvenTotalMonths: breakEvenMonth,
      earlierMonthly: earlier.monthlyBenefit,
      laterMonthly: later.monthlyBenefit
    }
  }

  // ─── Table Rendering ────────────────────────────────

  _renderStrategyTable(strategies) {
    if (!this.hasStrategyTableBodyTarget) return
    if (!strategies || strategies.length === 0) {
      this.strategyTableBodyTarget.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-gray-400">Enter your PIA and birthdate, then click Calculate Comparison.</td></tr>'
      return
    }

    const best = strategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b)
    this.strategyTableBodyTarget.innerHTML = strategies.map(s => {
      const isBest = s.lifetime === best.lifetime
      const highlight = isBest ? "bg-green-50 dark:bg-green-900/20 font-semibold" : ""
      const bestBadge = isBest ? ' <span class="text-green-600 dark:text-green-400 text-xs ml-1">Best</span>' : ''
      return `<tr class="${highlight} hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">${fmtAge(s.claimYears, s.claimMonths)}</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-900 dark:text-white">${fmtCurrency(s.monthlyBenefit)}/mo</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-900 dark:text-white">${fmtCurrency(s.lifetime)}${bestBadge}</td>
        <td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">${s.note || "\u2014"}</td>
      </tr>`
    }).join("")
  }

  // ─── Break-even Rendering ─────────────────────────────

  _renderBreakEven(breakEvens) {
    if (!this.hasBreakEvenBodyTarget) return
    if (!breakEvens || breakEvens.length === 0) {
      this.breakEvenBodyTarget.innerHTML = '<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Not enough data to compute break-even ages.</p>'
      return
    }

    const rows = breakEvens.map(be => {
      const earlierLabel = fmtAge(be.earlier.years, be.earlier.months)
      const laterLabel = fmtAge(be.later.years, be.later.months)
      const beLabel = be.breakEvenYears !== null
        ? fmtAge(be.breakEvenYears, be.breakEvenMonths)
        : "Never (earlier always wins)"
      const explanation = be.breakEvenYears !== null
        ? `If you live past ${fmtAge(be.breakEvenYears, be.breakEvenMonths)}, claiming at ${laterLabel} pays more over your lifetime than claiming at ${earlierLabel}.`
        : `Claiming at ${earlierLabel} produces more lifetime benefits regardless of lifespan.`
      const deathCheck = be.breakEvenYears !== null
        ? `<span class="text-gray-500 dark:text-gray-400 text-xs">Die before ${be.breakEvenYears}y${be.breakEvenMonths}m → ${earlierLabel} wins &nbsp;|&nbsp; Die after → ${laterLabel} wins</span>`
        : ""

      return `<div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">${earlierLabel} <span class="text-gray-400 mx-1">vs</span> ${laterLabel}</p>
          <p class="text-sm font-semibold text-brand-600 dark:text-brand-400">Break-even: ${beLabel}</p>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300">${explanation}</p>
        ${deathCheck ? `<div>${deathCheck}</div>` : ""}
      </div>`
    }).join("")

    this.breakEvenBodyTarget.innerHTML = rows
  }

  // ─── Line Chart ─────────────────────────────────────

  _renderLineChart(strategies, cola) {
    if (!this.hasTimelineChartTarget) return
    if (!strategies || strategies.length === 0) {
      this.timelineChartTarget.innerHTML = '<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Enter your details above to see the comparison chart.</p>'
      if (this.hasChartLegendTarget) this.chartLegendTarget.classList.add("hidden")
      return
    }

    const colaRate = cola || 2.6
    const minAge = 62
    const maxAge = 95
    const totalAgeMonths = (maxAge - minAge) * 12

    // Build cumulative data for each strategy line
    const allSeries = strategies.map((s, idx) => {
      const points = []
      let cumulative = 0
      for (let ageMonth = minAge * 12; ageMonth <= maxAge * 12; ageMonth++) {
        if (ageMonth >= s.totalClaimMonths) {
          const monthsDrawn = ageMonth - s.totalClaimMonths
          const yearIdx = Math.floor(monthsDrawn / 12)
          cumulative += s.monthlyBenefit * Math.pow(1 + colaRate / 100, yearIdx)
        }
        // Sample every 12 months for chart smoothness
        if (ageMonth % 12 === 0) {
          points.push({ age: ageMonth / 12, value: Math.round(cumulative) })
        }
      }
      return {
        strategy: s,
        color: LINE_COLORS[idx % LINE_COLORS.length],
        label: fmtAge(s.claimYears, s.claimMonths),
        points
      }
    })

    // Chart dimensions
    const W = 700, H = 350, PL = 80, PR = 30, PT = 20, PB = 40
    const plotW = W - PL - PR
    const plotH = H - PT - PB

    const allValues = allSeries.flatMap(s => s.points.map(p => p.value))
    const maxVal = Math.max(...allValues, 1)
    const totalAges = maxAge - minAge

    const xPos = (age) => PL + ((age - minAge) / totalAges) * plotW
    const yPos = (v) => PT + plotH - (v / maxVal) * plotH

    // Grid lines + Y-axis labels
    const gridCount = 5
    let gridLines = ""
    for (let i = 0; i <= gridCount; i++) {
      const val = (maxVal * i / gridCount)
      const y = yPos(val)
      gridLines += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5" />`
      const label = val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${Math.round(val / 1000)}K` : `$${Math.round(val)}`
      gridLines += `<text x="${PL - 8}" y="${y + 4}" text-anchor="end" fill="#9ca3af" font-size="10">${label}</text>`
    }

    // X-axis labels
    let xLabels = ""
    for (let age = minAge; age <= maxAge; age += 5) {
      xLabels += `<text x="${xPos(age)}" y="${H - PB + 18}" text-anchor="middle" fill="#9ca3af" font-size="10">${age}</text>`
    }

    // Polylines
    let polylines = ""
    allSeries.forEach(series => {
      const pointStr = series.points.map(p => `${xPos(p.age).toFixed(1)},${yPos(p.value).toFixed(1)}`).join(" ")
      polylines += `<polyline points="${pointStr}" fill="none" stroke="${series.color}" stroke-width="2.5" stroke-linejoin="round" />`
    })

    this.timelineChartTarget.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="w-full" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      ${polylines}
      ${xLabels}
    </svg>`

    // Dynamic legend
    if (this.hasChartLegendTarget) {
      this.chartLegendTarget.classList.remove("hidden")
      this.chartLegendTarget.innerHTML = allSeries.map(s =>
        `<div class="flex items-center space-x-2">
          <span class="inline-block w-4 h-0.5 rounded" style="background:${s.color}"></span>
          <span class="text-xs text-gray-500 dark:text-gray-400">${s.label}</span>
        </div>`
      ).join("")
    }
  }

  // ─── Recommendation / Narrative ─────────────────────

  _generateRecommendation(best, strategies, breakEvens) {
    if (!this.hasRecommendationTextTarget) return
    if (!best || !strategies || strategies.length === 0) {
      this.recommendationTextTarget.textContent = "Enter your details above to receive a personalized recommendation."
      return
    }

    const earliest = strategies[0]
    const latest = strategies[strategies.length - 1]

    let text = ""
    if (strategies.length === 1) {
      text = `With a single claiming age of ${fmtAge(best.claimYears, best.claimMonths)}, your estimated monthly benefit is ${fmtCurrency(best.monthlyBenefit)} with a projected lifetime value of ${fmtCurrency(best.lifetime)}.`
    } else {
      text = `Among your selected claiming ages, ${fmtAge(best.claimYears, best.claimMonths)} produces the highest projected lifetime value at ${fmtCurrency(best.lifetime)}.`

      // Add break-even narrative for earliest vs best
      if (breakEvens.length > 0) {
        const primaryBE = breakEvens.find(be =>
          be.earlier.years === earliest.claimYears && be.earlier.months === earliest.claimMonths &&
          be.later.years === best.claimYears && be.later.months === best.claimMonths
        )
        if (primaryBE && primaryBE.breakEvenYears !== null) {
          text += ` Claiming earlier gives you more total benefits if you pass away before age ${primaryBE.breakEvenYears}. If you live beyond ${fmtAge(primaryBE.breakEvenYears, primaryBE.breakEvenMonths)}, delaying becomes the better lifetime value.`
        }
      }
    }

    this.recommendationTextTarget.textContent = text
  }
}
