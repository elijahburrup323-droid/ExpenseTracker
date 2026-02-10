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

test.describe("DBU CM3: Record Browser Dropdown Parity + Default View", () => {
  test("Default landing view is Record Browser, not Schema Inspector", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Record Browser tab should be active
    const recordsTab = page.locator('[data-dbu-target="tabRecords"]');
    await expect(recordsTab).toHaveClass(/border-brand-600/);

    // Record Browser panel should be visible
    const recordsPanel = page.locator('[data-dbu-target="recordsPanel"]');
    await expect(recordsPanel).toBeVisible();

    // Schema panel should be hidden
    const schemaPanel = page.locator('[data-dbu-target="schemaPanel"]');
    await expect(schemaPanel).toBeHidden();
  });

  test("Record Browser dropdown lists ALL tables from information_schema", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Table Name dropdown should have many options (not just 11 from old catalog)
    const options = await page.locator('[data-dbu-target="tableNameSelect"] option').count();
    // Should have more than the old 11 + 1 (the placeholder "Select Table...")
    expect(options).toBeGreaterThan(12);

    // Should include tables NOT in the old catalog (like schema_migrations, ar_internal_metadata)
    const selectHtml = await page.locator('[data-dbu-target="tableNameSelect"]').innerHTML();
    expect(selectHtml).toContain("schema_migrations");
  });

  test("Record Browser table count matches Schema Inspector table count", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Count Record Browser dropdown options (minus the placeholder)
    const recordBrowserOptions = (await page.locator('[data-dbu-target="tableNameSelect"] option').count()) - 1;

    // Switch to Schema Inspector
    await page.locator('[data-dbu-target="tabSchema"]').click();
    await page.waitForTimeout(3000);

    // Count Schema Inspector tables
    const schemaTableCount = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();

    // They should match
    expect(recordBrowserOptions).toBe(schemaTableCount);
  });

  test("Selecting a non-catalog table loads records successfully", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Select schema_migrations (not in old catalog)
    const tableSelect = page.locator('[data-dbu-target="tableNameSelect"]');
    await tableSelect.selectOption("schema_migrations");
    await page.waitForTimeout(2000);

    // Should show record panel with data (not an error)
    const recordPanel = page.locator('[data-dbu-target="recordPanel"]');
    const panelText = await recordPanel.textContent();
    // Should show either records or "No records found" - not an error
    expect(panelText).not.toContain("Error");
    // schema_migrations should have records
    expect(panelText).toMatch(/of \d+ Filtered|No records found/);
  });

  test("Can switch to Schema Inspector and back", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Start on Record Browser
    await expect(page.locator('[data-dbu-target="recordsPanel"]')).toBeVisible();

    // Switch to Schema Inspector
    await page.locator('[data-dbu-target="tabSchema"]').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-dbu-target="schemaPanel"]')).toBeVisible();
    await expect(page.locator('[data-dbu-target="recordsPanel"]')).toBeHidden();

    // Switch back
    await page.locator('[data-dbu-target="tabRecords"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-dbu-target="recordsPanel"]')).toBeVisible();
    await expect(page.locator('[data-dbu-target="schemaPanel"]')).toBeHidden();
  });
});
