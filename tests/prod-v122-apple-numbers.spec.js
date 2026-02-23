// Production test: v1.2.2 — Apple Numbers upload format
const { test, expect } = require("@playwright/test")

const BASE = "https://djburrup.com/mybudgethq"

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`)
  await page.fill('input[name="user[email]"]', email)
  await page.fill('input[name="user[password]"]', password)
  await Promise.all([
    page.waitForURL(/dashboard/),
    page.click('input[type="submit"], button[type="submit"]')
  ])
  // Dismiss What's New overlay and modal
  await page.evaluate(() => document.getElementById("whatsNewOverlay")?.remove())
  await page.evaluate(() => document.querySelector("[data-dashboard-target='whatsNewModal']")?.remove())
}

test.describe("v1.2.2 Production — Apple Numbers Upload Format", () => {

  test("QA banner shows v1.2.2", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!")
    const banner = page.locator("text=v1.2.2")
    await expect(banner.first()).toBeVisible({ timeout: 10000 })
  })

  test("Accounts upload modal shows CSV, Excel, Apple Numbers radios", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!")
    await page.goto(`${BASE}/accounts`)
    await page.waitForLoadState("networkidle")

    // Open upload modal
    const uploadBtn = page.locator("button", { hasText: "Upload" })
    await expect(uploadBtn).toBeVisible({ timeout: 10000 })
    await uploadBtn.click({ force: true })

    const modal = page.locator("[data-upload-modal]")
    await expect(modal).toBeVisible()

    // Verify all 3 format radio buttons
    await expect(modal.locator('input[type="radio"][value="csv"]')).toBeVisible()
    await expect(modal.locator('input[type="radio"][value="excel"]')).toBeVisible()
    await expect(modal.locator('input[type="radio"][value="numbers"]')).toBeVisible()
    await expect(modal.getByText("Apple Numbers", { exact: true })).toBeVisible()

    // Verify instruction text
    await expect(modal.getByText("Apple Numbers users", { exact: false })).toBeVisible()
  })

  test("Apple Numbers radio can be selected and downloads template", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!")
    await page.goto(`${BASE}/accounts`)
    await page.waitForLoadState("networkidle")

    await page.locator("button", { hasText: "Upload" }).click({ force: true })
    const modal = page.locator("[data-upload-modal]")
    await expect(modal).toBeVisible()

    // Select Apple Numbers
    const numbersRadio = modal.locator('input[type="radio"][value="numbers"]')
    await numbersRadio.click()
    await expect(numbersRadio).toBeChecked()

    // Download template
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      modal.locator("button", { hasText: "Download Template" }).click()
    ])

    const filename = download.suggestedFilename()
    expect(filename).toContain("template.csv")

    // Verify UTF-8 BOM in content
    const path = await download.path()
    const fs = require("fs")
    const content = fs.readFileSync(path, "utf-8")
    expect(content.charCodeAt(0)).toBe(0xFEFF)
    expect(content).toContain("Name")
  })

  test("Payments upload modal also shows Apple Numbers option", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!")
    await page.goto(`${BASE}/payments`)
    await page.waitForLoadState("networkidle")

    const uploadBtn = page.locator("button", { hasText: "Upload" })
    await expect(uploadBtn).toBeVisible({ timeout: 10000 })
    await uploadBtn.click({ force: true })

    const modal = page.locator("[data-upload-modal]")
    await expect(modal).toBeVisible()
    await expect(modal.locator('input[type="radio"][value="numbers"]')).toBeVisible()
    await expect(modal.getByText("Apple Numbers", { exact: true })).toBeVisible()
  })

  test("Secondary account also sees Apple Numbers option", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb")
    await page.goto(`${BASE}/accounts`)
    await page.waitForLoadState("networkidle")

    const uploadBtn = page.locator("button", { hasText: "Upload" })
    await expect(uploadBtn).toBeVisible({ timeout: 10000 })
    await uploadBtn.click({ force: true })

    const modal = page.locator("[data-upload-modal]")
    await expect(modal).toBeVisible()
    await expect(modal.locator('input[type="radio"][value="numbers"]')).toBeVisible()
    await expect(modal.getByText("Apple Numbers", { exact: true })).toBeVisible()
  })
})
