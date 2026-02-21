import { Controller } from "@hotwired/stimulus"

// SSA 2022 Period Life Table (abridged: age → remaining years)
const LIFE_TABLE_MALE = {
  62:20.3,63:19.5,64:18.7,65:17.9,66:17.2,67:16.5,68:15.7,69:15.0,70:14.3,71:13.6,72:12.9,73:12.3,74:11.6,75:11.0,76:10.4,77:9.8,78:9.2,79:8.6,80:8.1,81:7.6,82:7.1,83:6.6,84:6.1,85:5.7,86:5.3,87:4.9,88:4.6,89:4.3,90:4.0
}
const LIFE_TABLE_FEMALE = {
  62:23.0,63:22.1,64:21.3,65:20.4,66:19.6,67:18.8,68:18.0,69:17.2,70:16.4,71:15.6,72:14.9,73:14.1,74:13.4,75:12.7,76:12.0,77:11.3,78:10.6,79:10.0,80:9.4,81:8.8,82:8.2,83:7.6,84:7.1,85:6.6,86:6.1,87:5.7,88:5.3,89:4.9,90:4.5
}

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

// Early/late claiming adjustment factor
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

export default class extends Controller {
  static targets = [
    "yourName", "yourSex", "yourBirthdate", "yourCurrentlyDrawing",
    "yourClaimAgeYears", "yourClaimAgeMonths", "yourFRA", "yourLifeExpectancy",
    "yourPIA",
    "spouseSection", "spouseName", "spouseSex", "spouseBirthdate", "spouseCurrentlyDrawing",
    "spouseClaimAgeYears", "spouseClaimAgeMonths", "spouseFRA", "spouseLifeExpectancy",
    "spousePIA",
    "colaRate",
    "summaryBody", "strategyTableBody", "strategyTableHead", "timelineChart",
    "yourOptimal", "spouseOptimal", "projectedValue",
    "assumptionsSection", "workingBeforeFRA",
    "recommendationText", "recommendationSection",
    "spouseEmptyState", "spouseCard", "chartLegend"
  ]

  connect() {
    this.hasSpouse = false
    this.sortField = null
    this.sortDir = "asc"
    this._lastStrategies = []
    this._calculate()
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
    this._calculate()
  }

  recalculate() {
    this._calculate()
  }

  resetScenario() {
    if (this.hasYourNameTarget) this.yourNameTarget.value = ""
    if (this.hasYourBirthdateTarget) this.yourBirthdateTarget.value = ""
    if (this.hasYourPIATarget) this.yourPIATarget.value = ""
    if (this.hasYourClaimAgeYearsTarget) this.yourClaimAgeYearsTarget.value = "67"
    if (this.hasYourClaimAgeMonthsTarget) this.yourClaimAgeMonthsTarget.value = "0"
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
    this._calculate()
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
        case "yourBenefit":
          valA = a.lifetime || 0
          valB = b.lifetime || 0
          return (valA - valB) * dir
        case "spouseClaimAge":
          valA = a.spouseClaimAge || 0
          valB = b.spouseClaimAge || 0
          return (valA - valB) * dir
        case "survivorBenefit":
          valA = a.survivorBenefit || 0
          valB = b.survivorBenefit || 0
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

  // ─── Core Calculation ───────────────────────────────

  _calculate() {
    const yourBirth = this.hasYourBirthdateTarget ? this.yourBirthdateTarget.value : ""
    const yourSex = this.hasYourSexTarget ? this.yourSexTarget.value : "male"
    const yourPIA = this.hasYourPIATarget ? parseFloat(this.yourPIATarget.value) || 0 : 0
    const yourClaimYears = this.hasYourClaimAgeYearsTarget ? parseInt(this.yourClaimAgeYearsTarget.value) || 67 : 67
    const yourClaimMonths = this.hasYourClaimAgeMonthsTarget ? parseInt(this.yourClaimAgeMonthsTarget.value) || 0 : 0
    const cola = this.hasColaRateTarget ? parseFloat(this.colaRateTarget.value) || 2.6 : 2.6
    const workingBeforeFRA = this.hasWorkingBeforeFRATarget ? this.workingBeforeFRATarget.value === "yes" : false

    if (yourBirth) {
      const birthDate = new Date(yourBirth)
      const birthYear = birthDate.getFullYear()
      const fra = getFRA(birthYear)
      if (this.hasYourFRATarget) {
        this.yourFRATarget.textContent = `${fra.years} years ${fra.months} months`
      }

      const now = new Date()
      const ageYears = now.getFullYear() - birthYear - (now < new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
      const le = lifeExpectancy(ageYears, yourSex)
      if (this.hasYourLifeExpectancyTarget) {
        this.yourLifeExpectancyTarget.textContent = `${Math.round(le)} Years`
      }

      const fraMonths = fra.years * 12 + fra.months
      const strategies = this._generateStrategies(yourPIA, fraMonths, le, cola, "You", workingBeforeFRA)

      // Spouse
      let spouseStrategies = []
      let spouseBestForRec = null
      if (this.hasSpouse) {
        const spouseBirth = this.hasSpouseBirthdateTarget ? this.spouseBirthdateTarget.value : ""
        const spouseSex = this.hasSpouseSexTarget ? this.spouseSexTarget.value : "female"
        const spousePIA = this.hasSpousePIATarget ? parseFloat(this.spousePIATarget.value) || 0 : 0

        if (spouseBirth) {
          const sBirth = new Date(spouseBirth)
          const sBirthYear = sBirth.getFullYear()
          const sFra = getFRA(sBirthYear)
          if (this.hasSpouseFRATarget) {
            this.spouseFRATarget.textContent = `${sFra.years} years ${sFra.months} months`
          }
          const sAge = now.getFullYear() - sBirthYear - (now < new Date(now.getFullYear(), sBirth.getMonth(), sBirth.getDate()) ? 1 : 0)
          const sLe = lifeExpectancy(sAge, spouseSex)
          if (this.hasSpouseLifeExpectancyTarget) {
            this.spouseLifeExpectancyTarget.textContent = `${Math.round(sLe)} Years`
          }
          const sFraMonths = sFra.years * 12 + sFra.months
          spouseStrategies = this._generateStrategies(spousePIA, sFraMonths, sLe, cola, "Spouse", workingBeforeFRA)

          // Attach spouse data to You strategies for table display
          if (spouseStrategies.length > 0) {
            spouseBestForRec = spouseStrategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b, spouseStrategies[0])
            strategies.forEach(s => {
              s.spouseClaimAge = spouseBestForRec.claimYears
              s.survivorBenefit = Math.round(Math.max(s.monthlyBenefit, spouseBestForRec.monthlyBenefit) * 12)
            })
          }
        }
      }

      // Cache for sorting
      this._lastStrategies = [...strategies]

      // Render table (apply current sort if active)
      const displayStrategies = this.sortField ? this._getSortedStrategies(this._lastStrategies) : this._lastStrategies
      this._renderStrategyTable(displayStrategies)
      this._updateSortIcons()

      // Optimal values
      const yourBest = strategies.length > 0 ? strategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b, strategies[0]) : null
      if (yourBest && this.hasYourOptimalTarget) {
        this.yourOptimalTarget.textContent = `${yourBest.claimYears} years ${yourBest.claimMonths} months`
      }

      if (spouseStrategies.length > 0 && spouseBestForRec && this.hasSpouseOptimalTarget) {
        this.spouseOptimalTarget.textContent = `${spouseBestForRec.claimYears} years ${spouseBestForRec.claimMonths} months`
      }

      const totalLifetime = (yourBest?.lifetime || 0) + (spouseBestForRec?.lifetime || 0)
      if (this.hasProjectedValueTarget) {
        this.projectedValueTarget.textContent = `$${Math.round(totalLifetime).toLocaleString()}`
      }

      // Line chart
      this._renderLineChart(strategies, cola)

      // Recommendation
      this._generateRecommendation(yourBest, strategies, spouseBestForRec)
    }
  }

  _generateStrategies(pia, fraMonths, lifeExp, colaRate, label, workingBeforeFRA) {
    if (pia <= 0) return []
    const strategies = []
    for (let age = 62; age <= 70; age++) {
      const claimMonths = age * 12
      const factor = claimingFactor(claimMonths, fraMonths)
      let monthlyBenefit = pia * factor

      // Simplified earnings test: if working before FRA and claiming early, reduce by 50%
      if (workingBeforeFRA && claimMonths < fraMonths) {
        monthlyBenefit *= 0.5
      }

      const yearsCollecting = Math.max(0, lifeExp - age)
      let lifetime = 0
      for (let y = 0; y < yearsCollecting; y++) {
        lifetime += monthlyBenefit * 12 * Math.pow(1 + colaRate / 100, y)
      }
      strategies.push({
        label,
        claimYears: age,
        claimMonths: 0,
        factor: (factor * 100).toFixed(1),
        monthlyBenefit: Math.round(monthlyBenefit),
        annualBenefit: Math.round(monthlyBenefit * 12),
        yearsCollecting: yearsCollecting.toFixed(1),
        lifetime: Math.round(lifetime),
        spouseClaimAge: null,
        survivorBenefit: null
      })
    }
    return strategies
  }

  // ─── Table Rendering ────────────────────────────────

  _renderStrategyTable(strategies) {
    if (!this.hasStrategyTableBodyTarget) return
    if (!strategies || strategies.length === 0) {
      this.strategyTableBodyTarget.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-gray-400">Enter your PIA and birthdate to see strategies.</td></tr>'
      return
    }

    const best = strategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b)
    this.strategyTableBodyTarget.innerHTML = strategies.map(s => {
      const isBest = s === best
      const highlight = isBest ? "bg-green-50 dark:bg-green-900/20 font-semibold" : ""
      const spouseAge = s.spouseClaimAge ? `${s.spouseClaimAge} years` : "\u2014"
      const survivorVal = s.survivorBenefit ? `$${s.survivorBenefit.toLocaleString()}` : "\u2014"
      return `<tr class="${highlight} hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">${s.claimYears} years ${s.claimMonths}m</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-900 dark:text-white">$${s.lifetime.toLocaleString()}</td>
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${spouseAge}</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-700 dark:text-gray-300">${survivorVal}</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-900 dark:text-white">$${s.lifetime.toLocaleString()}${isBest ? ' <span class="text-green-600 dark:text-green-400 text-xs">Best</span>' : ''}</td>
      </tr>`
    }).join("")
  }

  // ─── Line Chart ─────────────────────────────────────

  _renderLineChart(strategies, cola) {
    if (!this.hasTimelineChartTarget) return
    if (!strategies || strategies.length === 0) {
      this.timelineChartTarget.innerHTML = '<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Enter your details above to see the strategy comparison chart.</p>'
      if (this.hasChartLegendTarget) this.chartLegendTarget.classList.add("hidden")
      return
    }

    const early = strategies.find(s => s.claimYears === 62) || strategies[0]
    const optimal = strategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b)
    const late = strategies.find(s => s.claimYears === 70) || strategies[strategies.length - 1]

    const lines = [
      { strategy: optimal, color: "#3b82f6", label: "Optimal" },
      { strategy: early,   color: "#f59e0b", label: "Early" },
      { strategy: late,    color: "#ef4444", label: "Late" }
    ]

    const minAge = 62
    const maxAge = 95
    const colaRate = cola || 2.6

    // Build cumulative data for each line
    const allSeries = lines.map(l => {
      const s = l.strategy
      const points = []
      let cumulative = 0
      for (let age = minAge; age <= maxAge; age++) {
        if (age >= s.claimYears) {
          const yearsDrawn = age - s.claimYears
          cumulative += s.monthlyBenefit * 12 * Math.pow(1 + colaRate / 100, yearsDrawn)
        }
        points.push({ age, value: Math.round(cumulative) })
      }
      return { ...l, points }
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

    if (this.hasChartLegendTarget) this.chartLegendTarget.classList.remove("hidden")
  }

  // ─── Recommendation ─────────────────────────────────

  _generateRecommendation(yourBest, strategies, spouseBest) {
    if (!this.hasRecommendationTextTarget) return
    if (!yourBest || !strategies || strategies.length === 0) {
      this.recommendationTextTarget.textContent = "Enter your details above to receive a personalized recommendation."
      return
    }

    const earlyStrategy = strategies.find(s => s.claimYears === 62)
    const earlyDiff = yourBest.lifetime - (earlyStrategy?.lifetime || 0)

    let text = ""
    if (yourBest.claimYears === 62) {
      text = `Based on current assumptions, claiming benefits at age 62 maximizes your expected lifetime value at $${yourBest.lifetime.toLocaleString()}.`
    } else {
      text = `Based on current assumptions, delaying benefits until age ${yourBest.claimYears} maximizes expected lifetime value by $${earlyDiff.toLocaleString()} compared to claiming at 62.`
    }

    if (spouseBest) {
      text += ` Survivor protection improves significantly under the optimized strategy.`
    }

    this.recommendationTextTarget.textContent = text
  }
}
