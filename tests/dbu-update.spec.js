const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";
const AGENT = { email: "test@example.com", password: "password123" };

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("DBU Update — Schema Inspector & Record Browser", () => {
  test("Default landing is Record Browser with table count", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    // Record Browser panel should be visible (not hidden)
    const recordsPanel = page.locator("[data-dbu-target='recordsPanel']");
    await expect(recordsPanel).toBeVisible();

    // Schema panel should be hidden
    const schemaPanel = page.locator("[data-dbu-target='schemaPanel']");
    await expect(schemaPanel).toBeHidden();

    // Table count meta should be shown
    const meta = page.locator("[data-dbu-target='recordsMeta']");
    await expect(meta).toContainText("Tables:");
    await expect(meta).toContainText("Schema: public");
  });

  test("Record Browser dropdown has same tables as Schema Inspector", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    // Get Record Browser table count from dropdown options (minus placeholder)
    const nameSelect = page.locator("[data-dbu-target='tableNameSelect']");
    await expect(nameSelect).toBeVisible();
    const rbCount = await nameSelect.locator("option").count() - 1; // minus "Select Table..." placeholder

    // Switch to Schema Inspector
    await page.click("button:has-text('Schema Inspector')");
    await page.waitForLoadState("networkidle");

    // Wait for schema to load
    await expect(page.locator("[data-dbu-target='schemaMeta']")).toContainText("Tables:");

    // Get Schema Inspector table count from meta
    const metaText = await page.locator("[data-dbu-target='schemaMeta']").textContent();
    const siMatch = metaText.match(/Tables:\s*(\d+)/);
    const siCount = parseInt(siMatch[1], 10);

    // They must match
    expect(rbCount).toBe(siCount);
    expect(rbCount).toBeGreaterThan(0);
  });

  test("Record Browser Refresh button works", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    // Wait for initial load
    await expect(page.locator("[data-dbu-target='recordsMeta']")).toContainText("Tables:");

    // Click the visible Refresh button in the Record Browser panel
    const refreshBtn = page.locator("[data-dbu-target='recordsPanel'] button:has-text('Refresh')");
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // Wait a moment for the refresh to complete
    await page.waitForTimeout(2000);

    // Table count should still show after refresh
    await expect(page.locator("[data-dbu-target='recordsMeta']")).toContainText("Tables:");
  });

  test("Record Browser can select and browse a table", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    // Wait for dropdowns to populate
    const nameSelect = page.locator("[data-dbu-target='tableNameSelect']");
    await expect(nameSelect.locator("option")).not.toHaveCount(1); // more than just placeholder

    // Select the quotes table
    await nameSelect.selectOption("quotes");

    // Wait for records to load
    await page.waitForResponse(resp => resp.url().includes("/api/dbu/records") && resp.request().method() === "GET");

    // Record panel should show record fields or empty message
    const recordPanel = page.locator("[data-dbu-target='recordPanel']");
    await expect(recordPanel).toBeVisible();
  });
});
