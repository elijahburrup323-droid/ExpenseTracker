const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";

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
  test.describe(`Account Types Use Flag — ${acct.email}`, () => {
    test("Use column and toggle visible", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/account_types`);
      await page.waitForLoadState("networkidle");

      const useHeader = page.locator("th", { hasText: "Use" });
      await expect(useHeader).toBeVisible();

      const toggles = page.locator("button.use-toggle");
      await expect(toggles.first()).toBeVisible({ timeout: 10000 });

      const count = await toggles.count();
      expect(count).toBeGreaterThan(0);
    });

    test("Toggle OFF hides from Accounts dropdown, toggle back ON restores", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/account_types`);
      await page.waitForLoadState("networkidle");

      const toggles = page.locator("button.use-toggle");
      await expect(toggles.first()).toBeVisible({ timeout: 10000 });

      const firstRow = page.locator("tbody tr").first();
      const firstTypeName = (await firstRow.locator("td:nth-child(2)").textContent()).trim();
      const firstToggle = firstRow.locator("button.use-toggle");

      // Toggle OFF
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes("/api/account_types/") && resp.request().method() === "PUT" && resp.status() === 200),
        firstToggle.click(),
      ]);
      await expect(firstToggle).toHaveAttribute("data-checked", "false");

      // Check accounts dropdown
      await page.goto(`${BASE}/accounts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      const addBtn = page.locator('button:has-text("Add Account")');
      await addBtn.click();
      const typeSelect = page.locator("select[name='account_type_id']");
      await expect(typeSelect).toBeVisible();
      const options = await typeSelect.locator("option").allTextContents();
      expect(options).not.toContain(firstTypeName);

      // Toggle back ON
      await page.goto(`${BASE}/account_types`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("button.use-toggle").first()).toBeVisible({ timeout: 10000 });
      const cleanup = page.locator("tbody tr").first().locator("button.use-toggle");
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes("/api/account_types/") && resp.request().method() === "PUT" && resp.status() === 200),
        cleanup.click(),
      ]);
      await expect(cleanup).toHaveAttribute("data-checked", "true");
    });
  });
}
