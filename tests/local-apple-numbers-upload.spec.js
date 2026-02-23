// Test: Apple Numbers format appears in upload modal on all CRUD screens
const { test, expect } = require("@playwright/test")

const BASE = "http://localhost:3000/mybudgethq"
const EMAIL = "test@example.com"
const PASS  = "password123"

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`)
  await page.fill('input[name="user[email]"]', EMAIL)
  await page.fill('input[name="user[password]"]', PASS)
  await Promise.all([
    page.waitForURL(/dashboard/),
    page.click('input[type="submit"], button[type="submit"]')
  ])
  // Dismiss What's New overlay if present
  await page.evaluate(() => document.getElementById("whatsNewOverlay")?.remove())
  await page.evaluate(() => document.querySelector("[data-dashboard-target='whatsNewModal']")?.remove())
}

test.describe("Apple Numbers Upload Format", () => {

  test("Upload modal shows CSV, Excel, and Apple Numbers radio buttons", async ({ page }) => {
    await login(page)

    // Navigate to Accounts page (has upload button)
    await page.goto(`${BASE}/accounts`)
    await page.waitForLoadState("networkidle")

    // Click the Upload button to open modal
    const uploadBtn = page.locator("button", { hasText: "Upload" })
    await expect(uploadBtn).toBeVisible()
    await uploadBtn.click()

    // Verify modal is visible
    const modal = page.locator("[data-upload-modal]")
    await expect(modal).toBeVisible()

    // Check all 3 format radio buttons exist
    const csvRadio = modal.locator('input[type="radio"][value="csv"]')
    const excelRadio = modal.locator('input[type="radio"][value="excel"]')
    const numbersRadio = modal.locator('input[type="radio"][value="numbers"]')

    await expect(csvRadio).toBeVisible()
    await expect(excelRadio).toBeVisible()
    await expect(numbersRadio).toBeVisible()

    // Check Apple Numbers label text
    const numbersLabel = modal.getByText("Apple Numbers", { exact: true })
    await expect(numbersLabel).toBeVisible()

    // Check instruction text mentions Apple Numbers
    const instructionText = modal.getByText("Apple Numbers users", { exact: false })
    await expect(instructionText).toBeVisible()
  })

  test("Selecting Apple Numbers radio and clicking Download Template triggers download", async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/accounts`)
    await page.waitForLoadState("networkidle")

    // Open upload modal
    await page.locator("button", { hasText: "Upload" }).click()
    const modal = page.locator("[data-upload-modal]")
    await expect(modal).toBeVisible()

    // Select Apple Numbers format
    const numbersRadio = modal.locator('input[type="radio"][value="numbers"]')
    await numbersRadio.click()
    await expect(numbersRadio).toBeChecked()

    // Click Download Template and catch the download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      modal.locator("button", { hasText: "Download Template" }).click()
    ])

    // Verify the downloaded file
    const filename = download.suggestedFilename()
    expect(filename).toContain("template.csv")

    // Read the file content and verify UTF-8 BOM
    const path = await download.path()
    const fs = require("fs")
    const content = fs.readFileSync(path, "utf-8")
    // UTF-8 BOM should be present (BOM = \uFEFF)
    expect(content.charCodeAt(0)).toBe(0xFEFF)
    // Should have CSV headers
    expect(content).toContain("Name")
  })

  test("Apple Numbers format persists in localStorage across modal open/close", async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/accounts`)
    await page.waitForLoadState("networkidle")

    // Open modal and select Apple Numbers
    await page.locator("button", { hasText: "Upload" }).click()
    const modal = page.locator("[data-upload-modal]")
    await modal.locator('input[type="radio"][value="numbers"]').click()

    // Close modal
    await modal.locator("button", { hasText: "Cancel" }).click()

    // Verify localStorage
    const storedFormat = await page.evaluate(() => localStorage.getItem("budgethq_template_format"))
    expect(storedFormat).toBe("numbers")

    // Reopen modal - Numbers should still be selected
    await page.locator("button", { hasText: "Upload" }).click()
    const numbersRadio = modal.locator('input[type="radio"][value="numbers"]')
    await expect(numbersRadio).toBeChecked()
  })

  test("Upload modal with Apple Numbers format appears on Payments page too", async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/payments`)
    await page.waitForLoadState("networkidle")

    const uploadBtn = page.locator("button", { hasText: "Upload" })
    await expect(uploadBtn).toBeVisible()
    await uploadBtn.click()

    const modal = page.locator("[data-upload-modal]")
    await expect(modal).toBeVisible()

    // Apple Numbers radio should be present
    const numbersRadio = modal.locator('input[type="radio"][value="numbers"]')
    await expect(numbersRadio).toBeVisible()
  })
})
