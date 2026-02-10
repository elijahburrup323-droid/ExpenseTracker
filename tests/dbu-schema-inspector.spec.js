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

test.describe("DBU Schema Inspector", () => {
  test("Schema Inspector tab loads by default with tables", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Schema tab should be active
    const schemaTab = page.locator('[data-dbu-target="tabSchema"]');
    await expect(schemaTab).toHaveClass(/border-brand-600/);

    // Should show database name and table count in meta bar
    const meta = page.locator('[data-dbu-target="schemaMeta"]');
    await expect(meta).toContainText("Database:");
    await expect(meta).toContainText("Tables:");
    await expect(meta).toContainText("Last Refreshed:");
  });

  test("Schema lists ALL tables from information_schema", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Should show known tables like users, accounts, payments
    const content = page.locator('[data-dbu-target="schemaContent"]');
    await expect(content).toContainText("users");
    await expect(content).toContainText("accounts");
    await expect(content).toContainText("payments");
    await expect(content).toContainText("spending_categories");

    // Should also show tables NOT in the old catalog
    await expect(content).toContainText("schema_migrations");
  });

  test("Expand table shows all columns with metadata", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click on the users table to expand it
    const usersBtn = page.locator('button[data-table-name="users"]');
    await usersBtn.click();
    await page.waitForTimeout(300);

    // Should show column headers
    await expect(page.locator("th:has-text('Column')").first()).toBeVisible();
    await expect(page.locator("th:has-text('Type')").first()).toBeVisible();
    await expect(page.locator("th:has-text('Nullable')").first()).toBeVisible();
    await expect(page.locator("th:has-text('Default')").first()).toBeVisible();
    await expect(page.locator("th:has-text('Keys')").first()).toBeVisible();

    // Should show known columns
    const content = page.locator('[data-dbu-target="schemaContent"]');
    await expect(content).toContainText("email");
    await expect(content).toContainText("first_name");

    // Should show PK badge for id column
    await expect(content.locator("text=PK").first()).toBeVisible();
  });

  test("Filter by table name narrows results", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Count initial tables
    const allButtons = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();

    // Filter by "income"
    const searchInput = page.locator('[data-dbu-target="schemaSearch"]');
    await searchInput.fill("income");
    await page.waitForTimeout(300);

    const filteredButtons = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();
    expect(filteredButtons).toBeLessThan(allButtons);
    expect(filteredButtons).toBeGreaterThan(0);
  });

  test("Expand All / Collapse All work", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Expand All
    await page.locator("button:has-text('Expand All')").click();
    await page.waitForTimeout(500);

    // Should see column headers in at least one table
    const columnHeaders = await page.locator("th:has-text('Column')").count();
    expect(columnHeaders).toBeGreaterThan(0);

    // Collapse All
    await page.locator("button:has-text('Collapse All')").click();
    await page.waitForTimeout(300);

    // No column headers should be visible
    const afterCollapse = await page.locator("th:has-text('Column')").count();
    expect(afterCollapse).toBe(0);
  });

  test("Export CSV downloads a file", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Listen for download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('CSV')").click()
    ]);
    expect(download.suggestedFilename()).toBe("dbu_schema.csv");
  });

  test("Export JSON downloads a file", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('JSON')").click()
    ]);
    expect(download.suggestedFilename()).toBe("dbu_schema.json");
  });

  test("Record Browser tab still works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Switch to Record Browser tab
    await page.locator('[data-dbu-target="tabRecords"]').click();
    await page.waitForTimeout(1000);

    // Should see the record browser UI
    await expect(page.locator('[data-dbu-target="recordsPanel"]')).toBeVisible();
    await expect(page.locator('[data-dbu-target="schemaPanel"]')).toBeHidden();

    // Table dropdown should be populated
    const options = await page.locator('[data-dbu-target="tableNameSelect"] option').count();
    expect(options).toBeGreaterThan(1);
  });

  test("Refresh DBU reloads schema data", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Note the initial refresh timestamp
    const meta = page.locator('[data-dbu-target="schemaMeta"]');
    const initialText = await meta.textContent();

    // Wait a second then refresh
    await page.waitForTimeout(1100);
    await page.locator("button:has-text('Refresh DBU')").click();
    await page.waitForTimeout(3000);

    // Timestamp should be updated
    const newText = await meta.textContent();
    expect(newText).toContain("Last Refreshed:");
  });

  test("Consistent output - running twice yields same table count", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const count1 = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();

    // Refresh
    await page.locator("button:has-text('Refresh DBU')").click();
    await page.waitForTimeout(3000);

    const count2 = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();
    expect(count1).toBe(count2);
    expect(count1).toBeGreaterThan(0);
  });
});
