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
  test.describe(`Payment Refresh — ${acct.email}`, () => {
    test("Add Payment button visible on payments page", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator('button:has-text("Add Payment")')).toBeVisible();
    });

    test("Add Payment opens modal", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState("networkidle");

      await page.locator('button:has-text("Add Payment")').click();
      await page.waitForTimeout(300);

      const modal = page.locator('[data-payments-target="addModal"]');
      await expect(modal).toBeVisible();

      // Cancel to close
      await page.locator('[data-payments-target="addModal"] button:has-text("Cancel")').click();
      await page.waitForTimeout(300);
    });

    test("Sort column click shows sort indicator", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState("networkidle");

      const amountHeader = page.locator('[data-sort-col="amount"]');
      if (await amountHeader.count() > 0) {
        await amountHeader.click();
        await page.waitForTimeout(300);
        const indicator = amountHeader.locator(".sort-indicator");
        await expect(indicator).toBeVisible();
      }
    });
  });
}
