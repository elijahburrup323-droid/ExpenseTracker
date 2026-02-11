const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";
const EMAIL = "elijahburrup323@gmail.com";
const PASSWORD = "Eli624462!";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard|expensetracker\/?$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
  // Dismiss What's New popup if visible
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gotIt.click();
    await page.waitForTimeout(300);
  }
}

// Collect console errors and network failures
function setupMonitoring(page) {
  const issues = { jsErrors: [], networkErrors: [], apiResponses: [] };
  page.on("pageerror", (err) => issues.jsErrors.push(err.message));
  page.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("/api/")) {
      issues.apiResponses.push({ url: url.replace(BASE, ""), status: resp.status() });
      if (resp.status() >= 400) {
        issues.networkErrors.push({ url: url.replace(BASE, ""), status: resp.status() });
      }
    }
  });
  return issues;
}

test.describe("Production Regression", () => {

  test("login and dashboard loads", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await expect(page.locator("h2").filter({ hasText: "Spending Overview" })).toBeVisible();
    console.log("Dashboard API calls:", JSON.stringify(issues.apiResponses, null, 2));
    console.log("JS errors:", issues.jsErrors);
    console.log("Network errors:", issues.networkErrors);
  });

  test("admin menu visible", async ({ page }) => {
    await login(page);
    const sidebar = page.locator("aside");
    const adminVisible = await sidebar.locator("text=Admin").isVisible().catch(() => false);
    console.log("Admin menu visible:", adminVisible);
    if (adminVisible) {
      console.log("Documentation visible:", await sidebar.locator("text=Documentation").isVisible());
      console.log("Frequency Masters visible:", await sidebar.locator("text=Frequency Masters").isVisible());
      console.log("Users visible:", await sidebar.locator("text=Users").isVisible());
    }
    expect(adminVisible).toBeTruthy();
  });

  test("spending types - load and generate data", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await page.waitForTimeout(3000);
    const rowsBefore = await page.locator("tbody tr").count();
    console.log("Spending Types rows before:", rowsBefore);
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));

    // Try generate data if no rows
    const genBtn = page.locator("text=Generate Data").first();
    const genVisible = await genBtn.isVisible().catch(() => false);
    console.log("Generate Data button visible:", genVisible);

    if (genVisible && rowsBefore <= 1) {
      await genBtn.click();
      await page.waitForTimeout(5000);
      const rowsAfter = await page.locator("tbody tr").count();
      console.log("Spending Types rows after generate:", rowsAfter);
      console.log("Network errors after generate:", JSON.stringify(issues.networkErrors, null, 2));
    }
  });

  test("spending categories - load", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Spending Categories rows:", rows);
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));
    console.log("Network errors:", JSON.stringify(issues.networkErrors, null, 2));
  });

  test("account types - load and generate data", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await page.waitForTimeout(3000);
    const rowsBefore = await page.locator("tbody tr").count();
    console.log("Account Types rows:", rowsBefore);

    const genBtn = page.locator("text=Generate Data").first();
    const genVisible = await genBtn.isVisible().catch(() => false);
    console.log("Generate Data button visible:", genVisible);

    if (genVisible && rowsBefore <= 1) {
      await genBtn.click();
      await page.waitForTimeout(5000);
      const rowsAfter = await page.locator("tbody tr").count();
      console.log("Account Types rows after generate:", rowsAfter);
      console.log("Network errors:", JSON.stringify(issues.networkErrors, null, 2));
    }
  });

  test("accounts - load and generate data", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Accounts rows:", rows);
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));

    const genBtn = page.locator("text=Generate Data").first();
    const genVisible = await genBtn.isVisible().catch(() => false);
    console.log("Generate Data button visible:", genVisible);
  });

  test("payments - load and generate data", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Payments rows:", rows);
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));

    const genBtn = page.locator("text=Generate Data").first();
    const genVisible = await genBtn.isVisible().catch(() => false);
    console.log("Generate Data button visible:", genVisible);
  });

  test("income frequencies - load", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Income Frequencies rows:", rows);
    const bodyText = await page.locator("tbody").textContent();
    console.log("Table body text:", bodyText.substring(0, 200));
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));
    console.log("Network errors:", JSON.stringify(issues.networkErrors, null, 2));
  });

  test("income sources - load and generate data", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/income_recurrings`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Income Sources rows:", rows);
    const bodyText = await page.locator("tbody").textContent();
    console.log("Table body text:", bodyText.substring(0, 200));
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));
    console.log("Network errors:", JSON.stringify(issues.networkErrors, null, 2));

    const genBtn = page.locator("text=Generate Data").first();
    const genVisible = await genBtn.isVisible().catch(() => false);
    console.log("Generate Data button visible:", genVisible);

    if (genVisible && rows <= 1) {
      await genBtn.click();
      await page.waitForTimeout(8000);
      const rowsAfter = await page.locator("tbody tr").count();
      console.log("Income Sources rows after generate:", rowsAfter);
      console.log("Network errors after generate:", JSON.stringify(issues.networkErrors, null, 2));
    }
  });

  test("income entries - load and generate data", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/income_entries`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Income Entries rows:", rows);
    const bodyText = await page.locator("tbody").textContent();
    console.log("Table body text:", bodyText.substring(0, 200));
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));
    console.log("Network errors:", JSON.stringify(issues.networkErrors, null, 2));

    const genBtn = page.locator("text=Generate Data").first();
    const genVisible = await genBtn.isVisible().catch(() => false);
    console.log("Generate Data button visible:", genVisible);

    if (genVisible) {
      await genBtn.click();
      await page.waitForTimeout(8000);
      const rowsAfter = await page.locator("tbody tr").count();
      console.log("Income Entries rows after generate:", rowsAfter);
      console.log("Network errors after generate:", JSON.stringify(issues.networkErrors, null, 2));
      // Capture all API responses after generate
      console.log("All API responses:", JSON.stringify(issues.apiResponses, null, 2));
    }
  });

  test("frequency masters - load", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Frequency Masters rows:", rows);
    const bodyText = await page.locator("tbody").textContent();
    console.log("Table body text:", bodyText.substring(0, 300));
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));
    console.log("Network errors:", JSON.stringify(issues.networkErrors, null, 2));
  });

  test("admin users - load", async ({ page }) => {
    const issues = setupMonitoring(page);
    await login(page);
    await page.goto(`${BASE}/admin/users`);
    await page.waitForTimeout(3000);
    const rows = await page.locator("tbody tr").count();
    console.log("Admin Users rows:", rows);
    const bodyText = await page.locator("tbody").textContent();
    console.log("Table body text:", bodyText.substring(0, 300));
    console.log("API calls:", JSON.stringify(issues.apiResponses, null, 2));
    console.log("Network errors:", JSON.stringify(issues.networkErrors, null, 2));
  });
});
