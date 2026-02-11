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
  test.describe(`Card 2 Pie Labels — ${acct.email}`, () => {
    test("Pie chart legend shows name, balance, and percentage", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      await page.locator('button[aria-label="View pie chart"]').click();
      await page.waitForTimeout(700);

      const legendItems = page.locator('[data-dashboard-target="card2Flipper"] .mt-2 span.truncate');
      const count = await legendItems.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const text = await legendItems.nth(i).textContent();
        expect(text).toMatch(/\S+.*—.*\$[\d,.]+.*—.*\d+%/);
      }
    });

    test("Flip back returns to account list", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      await page.locator('button[aria-label="View pie chart"]').click();
      await page.waitForTimeout(700);

      await page.locator('button:has-text("Flip back")').click();
      await page.waitForTimeout(700);

      await expect(page.locator('button[aria-label="View pie chart"]')).toBeVisible();
    });
  });
}
