const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill(password);

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(4000);
}

test.describe("Production CM3: Record Browser Parity", () => {
  test("elijahburrup323 - Default view is Record Browser, dropdown has all tables", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4000);

    // Record Browser should be the active tab (default)
    const recordsTab = page.locator('[data-dbu-target="tabRecords"]');
    await expect(recordsTab).toHaveClass(/border-brand-600/);

    // Record Browser panel visible, Schema panel hidden
    await expect(page.locator('[data-dbu-target="recordsPanel"]')).toBeVisible();
    await expect(page.locator('[data-dbu-target="schemaPanel"]')).toBeHidden();

    // Dropdown should have many options (all information_schema tables, not just 11 catalog)
    const options = await page.locator('[data-dbu-target="tableNameSelect"] option').count();
    expect(options).toBeGreaterThan(12);

    // Should include non-catalog tables
    const selectHtml = await page.locator('[data-dbu-target="tableNameSelect"]').innerHTML();
    expect(selectHtml).toContain("schema_migrations");

    // Switch to Schema Inspector and back
    await page.locator('[data-dbu-target="tabSchema"]').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-dbu-target="schemaPanel"]')).toBeVisible();

    // Count should match
    const recordBrowserCount = options - 1; // minus placeholder
    const schemaTableCount = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();
    expect(recordBrowserCount).toBe(schemaTableCount);
  });

  test("djburrup - Record Browser dropdown parity and table selection works", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4000);

    // Default is Record Browser
    await expect(page.locator('[data-dbu-target="recordsPanel"]')).toBeVisible();

    // Select a non-catalog table
    const tableSelect = page.locator('[data-dbu-target="tableNameSelect"]');
    await tableSelect.selectOption("schema_migrations");
    await page.waitForTimeout(3000);

    // Should show records without error
    const recordPanel = page.locator('[data-dbu-target="recordPanel"]');
    const panelText = await recordPanel.textContent();
    expect(panelText).not.toContain("Error");
    expect(panelText).toMatch(/of \d+ Filtered|No records found/);
  });
});
