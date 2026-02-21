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
    // Early: reduce 5/9 of 1% per month for first 36 months, 5/12 of 1% after
    const earlyMonths = Math.abs(diff)
    let reduction = 0
    if (earlyMonths <= 36) {
      reduction = earlyMonths * (5 / 900)
    } else {
      reduction = 36 * (5 / 900) + (earlyMonths - 36) * (5 / 1200)
    }
    return 1.0 - reduction
  }
  // Late: 8% per year (2/3 of 1% per month) up to age 70
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
    "summaryBody", "strategyTableBody", "timelineChart",
    "yourOptimal", "spouseOptimal", "projectedValue"
  ]

  connect() {
    this.hasSpouse = false
    this._calculate()
  }

  toggleSpouse() {
    this.hasSpouse = !this.hasSpouse
    if (this.hasSpouse) {
      this.spouseSectionTarget.classList.remove("hidden")
    } else {
      this.spouseSectionTarget.classList.add("hidden")
    }
    this._calculate()
  }

  recalculate() {
    this._calculate()
  }

  _calculate() {
    // Parse your info
    const yourBirth = this.hasYourBirthdateTarget ? this.yourBirthdateTarget.value : ""
    const yourSex = this.hasYourSexTarget ? this.yourSexTarget.value : "male"
    const yourPIA = this.hasYourPIATarget ? parseFloat(this.yourPIATarget.value) || 0 : 0
    const yourClaimYears = this.hasYourClaimAgeYearsTarget ? parseInt(this.yourClaimAgeYearsTarget.value) || 67 : 67
    const yourClaimMonths = this.hasYourClaimAgeMonthsTarget ? parseInt(this.yourClaimAgeMonthsTarget.value) || 0 : 0
    const cola = this.hasColaRateTarget ? parseFloat(this.colaRateTarget.value) || 2.5 : 2.5

    if (yourBirth) {
      const birthDate = new Date(yourBirth)
      const birthYear = birthDate.getFullYear()
      const fra = getFRA(birthYear)
      if (this.hasYourFRATarget) {
        this.yourFRATarget.innerHTML = `${fra.years} years<br>${fra.months} months`
      }

      // Current age
      const now = new Date()
      const ageYears = now.getFullYear() - birthYear - (now < new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)

      // Life expectancy
      const le = lifeExpectancy(ageYears, yourSex)
      if (this.hasYourLifeExpectancyTarget) {
        const leYears = Math.floor(le)
        const leMonths = Math.round((le - leYears) * 12)
        this.yourLifeExpectancyTarget.innerHTML = `${leYears} years<br>${leMonths} months`
      }

      // Calculate claiming scenarios for strategy table
      const fraMonths = fra.years * 12 + fra.months
      const strategies = this._generateStrategies(yourPIA, fraMonths, le, cola, "You")

      // Spouse calculations
      let spouseStrategies = []
      if (this.hasSpouse) {
        const spouseBirth = this.hasSpouseBirthdateTarget ? this.spouseBirthdateTarget.value : ""
        const spouseSex = this.hasSpouseSexTarget ? this.spouseSexTarget.value : "female"
        const spousePIA = this.hasSpousePIATarget ? parseFloat(this.spousePIATarget.value) || 0 : 0
        const spouseClaimYears = this.hasSpouseClaimAgeYearsTarget ? parseInt(this.spouseClaimAgeYearsTarget.value) || 67 : 67
        const spouseClaimMonths = this.hasSpouseClaimAgeMonthsTarget ? parseInt(this.spouseClaimAgeMonthsTarget.value) || 0 : 0

        if (spouseBirth) {
          const sBirth = new Date(spouseBirth)
          const sBirthYear = sBirth.getFullYear()
          const sFra = getFRA(sBirthYear)
          if (this.hasSpouseFRATarget) {
            this.spouseFRATarget.innerHTML = `${sFra.years} years<br>${sFra.months} months`
          }
          const sAge = now.getFullYear() - sBirthYear - (now < new Date(now.getFullYear(), sBirth.getMonth(), sBirth.getDate()) ? 1 : 0)
          const sLe = lifeExpectancy(sAge, spouseSex)
          if (this.hasSpouseLifeExpectancyTarget) {
            const sLeYears = Math.floor(sLe)
            const sLeMonths = Math.round((sLe - sLeYears) * 12)
            this.spouseLifeExpectancyTarget.innerHTML = `${sLeYears} years<br>${sLeMonths} months`
          }
          const sFraMonths = sFra.years * 12 + sFra.months
          spouseStrategies = this._generateStrategies(spousePIA, sFraMonths, sLe, cola, "Spouse")
        }
      }

      // Find optimal
      const allStrategies = [...strategies, ...spouseStrategies]
      this._renderStrategyTable(allStrategies)

      const yourBest = strategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b, strategies[0])
      if (yourBest && this.hasYourOptimalTarget) {
        this.yourOptimalTarget.innerHTML = `${yourBest.claimYears} years<br>${yourBest.claimMonths} months`
      }

      if (spouseStrategies.length > 0) {
        const spouseBest = spouseStrategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b, spouseStrategies[0])
        if (spouseBest && this.hasSpouseOptimalTarget) {
          this.spouseOptimalTarget.innerHTML = `${spouseBest.claimYears} years<br>${spouseBest.claimMonths} months`
        }
      }

      const totalLifetime = (yourBest?.lifetime || 0) + (spouseStrategies.length > 0 ?
        (spouseStrategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b, spouseStrategies[0])?.lifetime || 0) : 0)
      if (this.hasProjectedValueTarget) {
        this.projectedValueTarget.textContent = `$${Math.round(totalLifetime).toLocaleString()}`
      }

      // Timeline
      if (yourBest) this._renderTimeline(yourBest, strategies)
    }
  }

  _generateStrategies(pia, fraMonths, lifeExp, colaRate, label) {
    if (pia <= 0) return []
    const strategies = []
    // Test ages 62 to 70
    for (let age = 62; age <= 70; age++) {
      const claimMonths = age * 12
      const factor = claimingFactor(claimMonths, fraMonths)
      const monthlyBenefit = pia * factor
      const yearsCollecting = Math.max(0, lifeExp - age)
      // Lifetime value with COLA
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
        lifetime: Math.round(lifetime)
      })
    }
    return strategies
  }

  _renderStrategyTable(strategies) {
    if (!this.hasStrategyTableBodyTarget) return
    if (strategies.length === 0) {
      this.strategyTableBodyTarget.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-gray-400">Enter your PIA and birthdate to see strategies.</td></tr>`
      return
    }

    const best = strategies.reduce((a, b) => a.lifetime > b.lifetime ? a : b)
    this.strategyTableBodyTarget.innerHTML = strategies.map(s => {
      const isBest = s === best
      const highlight = isBest ? "bg-green-50 dark:bg-green-900/20 font-semibold" : ""
      return `<tr class="${highlight} hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${s.label}</td>
        <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">${s.claimYears}y ${s.claimMonths}m</td>
        <td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${s.factor}%</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-900 dark:text-white">$${s.monthlyBenefit.toLocaleString()}</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-900 dark:text-white">$${s.annualBenefit.toLocaleString()}</td>
        <td class="px-4 py-2 text-sm text-right font-mono text-gray-900 dark:text-white">$${s.lifetime.toLocaleString()}${isBest ? ' <span class="text-green-600 dark:text-green-400 text-xs">Best</span>' : ''}</td>
      </tr>`
    }).join("")
  }

  _renderTimeline(best, strategies) {
    if (!this.hasTimelineChartTarget) return
    if (!strategies || strategies.length === 0) {
      this.timelineChartTarget.innerHTML = ""
      return
    }

    const maxVal = Math.max(...strategies.map(s => s.lifetime))
    const barWidth = 100 / strategies.length
    const bars = strategies.map((s, i) => {
      const height = maxVal > 0 ? (s.lifetime / maxVal * 200) : 0
      const isBest = s === best
      const color = isBest ? "#22c55e" : "#a855f7"
      const x = i * barWidth + barWidth * 0.15
      const w = barWidth * 0.7
      return `<rect x="${x}%" y="${220 - height}" width="${w}%" height="${height}" fill="${color}" rx="3"/>
              <text x="${x + w / 2}%" y="235" text-anchor="middle" class="text-xs fill-gray-500 dark:fill-gray-400" font-size="10">${s.claimYears}</text>`
    }).join("")

    this.timelineChartTarget.innerHTML = `<svg viewBox="0 0 100 245" class="w-full" preserveAspectRatio="none" style="height: 200px">
      ${bars}
      <text x="50" y="245" text-anchor="middle" class="text-xs fill-gray-400" font-size="8">Claim Age</text>
    </svg>`
  }

  resetScenario() {
    if (this.hasYourNameTarget) this.yourNameTarget.value = ""
    if (this.hasYourBirthdateTarget) this.yourBirthdateTarget.value = ""
    if (this.hasYourPIATarget) this.yourPIATarget.value = ""
    if (this.hasYourClaimAgeYearsTarget) this.yourClaimAgeYearsTarget.value = "67"
    if (this.hasYourClaimAgeMonthsTarget) this.yourClaimAgeMonthsTarget.value = "0"
    this.hasSpouse = false
    if (this.hasSpouseSectionTarget) this.spouseSectionTarget.classList.add("hidden")
    this._calculate()
  }
}
