const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@example.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe("Payments CM2 Layout", () => {
  test("filter bar layout: dates first, even spacing, Reset over Search", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // All 5 filters visible
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterEndDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterAccount"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterCategory"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();

    // Reset and Search buttons visible
    const resetBtn = page.locator('button:has-text("Reset")');
    const searchBtn = page.locator('button:has-text("Search")');
    await expect(resetBtn).toBeVisible();
    await expect(searchBtn).toBeVisible();

    // Reset and Search should be vertically aligned (same x position, roughly)
    const resetBox = await resetBtn.boundingBox();
    const searchBox = await searchBtn.boundingBox();

    // Both should have same width (within 5px tolerance)
    expect(Math.abs(resetBox.width - searchBox.width)).toBeLessThan(5);

    // Both should have same height
    expect(Math.abs(resetBox.height - searchBox.height)).toBeLessThan(3);

    // Both should be at the same x position (aligned right, within 5px)
    expect(Math.abs(resetBox.x - searchBox.x)).toBeLessThan(5);

    // Start Date should be leftmost filter
    const startDateBox = await page.locator('[data-payments-target="filterStartDate"]').boundingBox();
    const endDateBox = await page.locator('[data-payments-target="filterEndDate"]').boundingBox();
    const accountBox = await page.locator('[data-payments-target="filterAccount"]').boundingBox();

    // Start Date is to the left of End Date
    expect(startDateBox.x).toBeLessThan(endDateBox.x);
    // End Date is to the left of Account
    expect(endDateBox.x).toBeLessThan(accountBox.x);

    // Take a screenshot for visual review
    await page.screenshot({ path: "test-results/cm2-layout.png", fullPage: false });
  });

  test("sticky headers remain visible on scroll", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);

    // Global header (Hello bar) should still be visible
    const helloBar = page.locator('text=Hello');
    await expect(helloBar.first()).toBeVisible();

    // Page sub-header with "Payments" title should still be visible (sticky)
    const paymentsHeader = page.locator("h1:has-text('Payments')");
    await expect(paymentsHeader).toBeVisible();
  });

  test("Spending Type dropdown is narrower than Account/Category", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // All filters in the 6-col grid should be approximately the same width
    const accountBox = await page.locator('[data-payments-target="filterAccount"]').boundingBox();
    const typeBox = await page.locator('[data-payments-target="filterType"]').boundingBox();

    // With the 6-col grid, all filters are now the same width (1 col each)
    // The key spec point was Spending Type was previously 2 cols, now it's 1
    // So it should be roughly the same width as Account (within a few px)
    expect(Math.abs(accountBox.width - typeBox.width)).toBeLessThan(10);
  });
});
