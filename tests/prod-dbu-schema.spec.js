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

test.describe("Production DBU Schema Inspector", () => {
  test("elijahburrup323 - Schema Inspector loads ALL tables with metadata", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4000);

    // Meta bar should show database and table count
    const meta = page.locator('[data-dbu-target="schemaMeta"]');
    await expect(meta).toContainText("Database:");
    await expect(meta).toContainText("Tables:");

    // Should show key tables
    const content = page.locator('[data-dbu-target="schemaContent"]');
    await expect(content).toContainText("users");
    await expect(content).toContainText("payments");
    await expect(content).toContainText("schema_migrations");

    // Expand users table and verify columns
    await page.locator('button[data-table-name="users"]').click();
    await page.waitForTimeout(500);
    await expect(content).toContainText("email");
    await expect(content.locator("text=PK").first()).toBeVisible();

    // Export CSV works
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('CSV')").click()
    ]);
    expect(download.suggestedFilename()).toBe("dbu_schema.csv");
  });

  test("djburrup - Schema Inspector loads, filter and expand/collapse work", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4000);

    // Schema tab active
    await expect(page.locator('[data-dbu-target="tabSchema"]')).toHaveClass(/border-brand-600/);

    // Filter works
    const allCount = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();
    await page.locator('[data-dbu-target="schemaSearch"]').fill("income");
    await page.waitForTimeout(300);
    const filteredCount = await page.locator('[data-dbu-target="schemaContent"] button[data-table-name]').count();
    expect(filteredCount).toBeLessThan(allCount);
    expect(filteredCount).toBeGreaterThan(0);

    // Expand All works
    await page.locator("button:has-text('Expand All')").click();
    await page.waitForTimeout(500);
    const columnHeaders = await page.locator("th:has-text('Column')").count();
    expect(columnHeaders).toBeGreaterThan(0);

    // Collapse All works
    await page.locator("button:has-text('Collapse All')").click();
    await page.waitForTimeout(300);
    const afterCollapse = await page.locator("th:has-text('Column')").count();
    expect(afterCollapse).toBe(0);
  });
});
