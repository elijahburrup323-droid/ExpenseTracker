const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/mybudgethq";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "test@example.com");
  await page.fill('input[name="user[password]"]', "password123");
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("CM-14: Monthly Cash Flow — Report Options Modal", () => {
  test("Modal appears when navigating to monthly cash flow", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // Modal should be visible
    const modal = page.locator('[data-monthly-cash-flow-target="optionsModal"]');
    await expect(modal).toBeVisible();

    // Report content should be hidden
    const content = page.locator('[data-monthly-cash-flow-target="reportContent"]').first();
    expect(await content.evaluate(el => el.style.display)).toBe("none");
  });

  test("Modal has Regular and Comparison radio buttons with Regular as default", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    const regular = page.locator('[data-monthly-cash-flow-target="typeRegular"]');
    const comparison = page.locator('[data-monthly-cash-flow-target="typeComparison"]');

    await expect(regular).toBeChecked();
    await expect(comparison).not.toBeChecked();
  });

  test("Comparison options are hidden by default and shown when Comparison is selected", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    const options = page.locator('[data-monthly-cash-flow-target="comparisonOptions"]');
    await expect(options).toHaveClass(/hidden/);

    // Select Comparison
    await page.locator('[data-monthly-cash-flow-target="typeComparison"]').check();
    await expect(options).not.toHaveClass(/hidden/);

    // Compare to Previous Month should be checked by default
    await expect(page.locator('[data-monthly-cash-flow-target="comparePrev"]')).toBeChecked();
    // Include YTD should NOT be checked by default
    await expect(page.locator('[data-monthly-cash-flow-target="includeYtd"]')).not.toBeChecked();
  });

  test("Comparison requires at least one option selected", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // Select Comparison
    await page.locator('[data-monthly-cash-flow-target="typeComparison"]').check();

    // Uncheck both options
    await page.locator('[data-monthly-cash-flow-target="comparePrev"]').uncheck();
    await page.locator('[data-monthly-cash-flow-target="includeYtd"]').uncheck();

    // Click Run Report
    await page.click('button:has-text("Run Report")');

    // Error should be visible
    const error = page.locator('[data-monthly-cash-flow-target="comparisonError"]');
    await expect(error).not.toHaveClass(/hidden/);
  });

  test("Regular mode: Run Report closes modal and shows report", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // Click Run Report (Regular is default)
    await page.click('button:has-text("Run Report")');

    // Modal should be hidden
    const modal = page.locator('[data-monthly-cash-flow-target="optionsModal"]');
    await expect(modal).toBeHidden();

    // Report content should be visible
    const content = page.locator('[data-monthly-cash-flow-target="reportContent"]').first();
    await expect(content).toBeVisible();

    // Mode label should say Regular
    const modeLabel = page.locator('[data-monthly-cash-flow-target="modeLabel"]');
    await expect(modeLabel).toHaveText("Regular");

    // Summary table should have data (wait for API)
    await page.waitForSelector('[data-monthly-cash-flow-target="summaryBody"] tr:not(:has-text("Loading"))', { timeout: 10000 });
    const rows = page.locator('[data-monthly-cash-flow-target="summaryBody"] tr');
    await expect(rows).toHaveCount(5); // 5 summary rows
  });

  test("Comparison mode: shows side-by-side columns with variance", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // Select Comparison with Compare to Previous Month
    await page.locator('[data-monthly-cash-flow-target="typeComparison"]').check();
    await page.click('button:has-text("Run Report")');

    // Wait for report to render
    await page.waitForSelector('[data-monthly-cash-flow-target="summaryBody"] tr:not(:has-text("Loading"))', { timeout: 10000 });

    // Mode label should say Comparison
    const modeLabel = page.locator('[data-monthly-cash-flow-target="modeLabel"]');
    await expect(modeLabel).toHaveText("Comparison");

    // Header should have 5 columns: Item, Current Month, Prev Month, Var ($), Var (%)
    const headers = page.locator('[data-monthly-cash-flow-target="summaryHead"] th');
    await expect(headers).toHaveCount(5);
  });

  test("Comparison mode with YTD: shows YTD column", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // Select Comparison with both options
    await page.locator('[data-monthly-cash-flow-target="typeComparison"]').check();
    await page.locator('[data-monthly-cash-flow-target="includeYtd"]').check();
    await page.click('button:has-text("Run Report")');

    // Wait for report to render
    await page.waitForSelector('[data-monthly-cash-flow-target="summaryBody"] tr:not(:has-text("Loading"))', { timeout: 10000 });

    // Header should have 6 columns: Item, Current, Prev, Var ($), Var (%), YTD
    const headers = page.locator('[data-monthly-cash-flow-target="summaryHead"] th');
    await expect(headers).toHaveCount(6);
  });

  test("Cancel button navigates back to reports index", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    await Promise.all([
      page.waitForURL(`${BASE}/reports`),
      page.click('a:has-text("Cancel")'),
    ]);
  });

  test("Change Options button re-opens the modal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // Run regular report
    await page.click('button:has-text("Run Report")');
    await page.waitForSelector('[data-monthly-cash-flow-target="summaryBody"] tr:not(:has-text("Loading"))', { timeout: 10000 });

    // Click Change Options
    await page.click('button:has-text("Change Options")');

    // Modal should be visible again
    const modal = page.locator('[data-monthly-cash-flow-target="optionsModal"]');
    await expect(modal).toBeVisible();
  });

  test("Month navigation buttons are removed", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // Run report first
    await page.click('button:has-text("Run Report")');
    await page.waitForSelector('[data-monthly-cash-flow-target="reportContent"]:not([style*="display:none"])');

    // There should be no prev/next month buttons
    const prevBtn = page.locator('button[data-action*="prevMonth"]');
    const nextBtn = page.locator('button[data-action*="nextMonth"]');
    await expect(prevBtn).toHaveCount(0);
    await expect(nextBtn).toHaveCount(0);
  });

  test("Open month is displayed as read-only in modal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports/monthly_cash_flow`);
    await page.waitForLoadState("networkidle");

    // The modal should show the open month label
    const monthDisplay = page.locator('[data-monthly-cash-flow-target="optionsModal"]');
    await expect(monthDisplay).toContainText("Open Month");
    // Should show a month name (e.g., "February 2026")
    const monthText = await monthDisplay.textContent();
    expect(monthText).toMatch(/\w+ \d{4}/);
  });
});
