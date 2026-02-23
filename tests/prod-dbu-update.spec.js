const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", password: "Eli624462!" },
  { email: "djburrup@gmail.com", password: "luckydjb" },
];

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

for (const acct of ACCOUNTS) {
  test.describe(`DBU Update — ${acct.email}`, () => {
    test("Default landing is Record Browser with table count and schema info", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/dbu`);
      await page.waitForLoadState("networkidle");

      // Record Browser panel visible
      const recordsPanel = page.locator("[data-dbu-target='recordsPanel']");
      await expect(recordsPanel).toBeVisible();

      // Schema panel hidden
      const schemaPanel = page.locator("[data-dbu-target='schemaPanel']");
      await expect(schemaPanel).toBeHidden();

      // Meta shows table count and schema
      const meta = page.locator("[data-dbu-target='recordsMeta']");
      await expect(meta).toContainText("Tables:");
      await expect(meta).toContainText("Schema: public");
    });

    test("Record Browser and Schema Inspector show same table count", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/dbu`);
      await page.waitForLoadState("networkidle");

      // Get Record Browser table count from dropdown
      const nameSelect = page.locator("[data-dbu-target='tableNameSelect']");
      await expect(nameSelect).toBeVisible();
      const rbCount = await nameSelect.locator("option").count() - 1;

      // Switch to Schema Inspector
      await page.click("button:has-text('Schema Inspector')");
      await expect(page.locator("[data-dbu-target='schemaMeta']")).toContainText("Tables:");

      const metaText = await page.locator("[data-dbu-target='schemaMeta']").textContent();
      const siMatch = metaText.match(/Tables:\s*(\d+)/);
      const siCount = parseInt(siMatch[1], 10);

      expect(rbCount).toBe(siCount);
      expect(rbCount).toBeGreaterThan(0);
    });

    test("Refresh button reloads Record Browser data", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/dbu`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("[data-dbu-target='recordsMeta']")).toContainText("Tables:");

      const refreshBtn = page.locator("[data-dbu-target='recordsPanel'] button:has-text('Refresh')");
      await expect(refreshBtn).toBeVisible();
      await refreshBtn.click();
      await page.waitForTimeout(2000);

      await expect(page.locator("[data-dbu-target='recordsMeta']")).toContainText("Tables:");
    });
  });
}
