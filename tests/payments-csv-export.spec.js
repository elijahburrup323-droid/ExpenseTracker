const { test, expect } = require("@playwright/test");
const fs = require("fs");

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

async function ensurePaymentsExist(page) {
  // If no payments, generate some via the Generate Data button
  await page.goto(`${BASE}/payments`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const emptyMsg = page.locator('text=No payments found');
  if (await emptyMsg.isVisible()) {
    // Need accounts and categories first — generate via their pages
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const genAccounts = page.locator('button:has-text("Generate Data")');
    if (await genAccounts.isVisible()) {
      await genAccounts.click();
      await page.waitForTimeout(5000);
    }

    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const genCategories = page.locator('button:has-text("Generate Data")');
    if (await genCategories.isVisible()) {
      await genCategories.click();
      await page.waitForTimeout(5000);
    }

    // Now generate payments
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const genPayments = page.locator('button:has-text("Generate Data")');
    if (await genPayments.isVisible()) {
      await genPayments.click();
      await page.waitForTimeout(5000);
    }
  }
}

test.describe.serial("Payments CSV Export", () => {
  test("Export CSV button is visible on payments page", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();
  });

  test("Export CSV downloads a file with correct headers and data", async ({ page }) => {
    await login(page);
    await ensurePaymentsExist(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Listen for download
    const downloadPromise = page.waitForEvent("download");
    await page.locator('button:has-text("Export CSV")').click();
    const download = await downloadPromise;

    // Verify filename pattern: payments_YYYY-MM-DD.csv
    expect(download.suggestedFilename()).toMatch(/^payments_\d{4}-\d{2}-\d{2}\.csv$/);

    // Read file content
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    // Verify CSV headers
    expect(lines[0]).toBe("Date,Account,Category,Spending Type,Description,Amount");

    // Verify at least one data row with a date
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2},/);
  });

  test("Export CSV shows alert when no payments match filters", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Set an impossible date range to get zero results
    const startDate = page.locator('[data-payments-target="filterStartDate"]');
    await startDate.fill("1900-01-01");
    await startDate.dispatchEvent("change");

    const endDate = page.locator('[data-payments-target="filterEndDate"]');
    await endDate.fill("1900-01-02");
    await endDate.dispatchEvent("change");
    await page.waitForTimeout(500);

    // Handle the alert — must set handler before click since alert() blocks
    let alertMessage = "";
    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.locator('button:has-text("Export CSV")').click();
    await page.waitForTimeout(1000);
    expect(alertMessage).toContain("No payments to export");
  });
});
