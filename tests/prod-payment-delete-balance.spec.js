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
  test.describe(`Payment Delete Balance — ${acct.email}`, () => {
    test("Delete buttons visible on payment rows", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState("networkidle");

      const deleteButtons = page.locator('button[title="Delete"]');
      const count = await deleteButtons.count();
      if (count > 0) {
        await expect(deleteButtons.first()).toBeVisible();
      }
    });

    test("Delete modal shows and cancel works", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState("networkidle");

      const deleteButtons = page.locator('button[title="Delete"]');
      const count = await deleteButtons.count();
      if (count > 0) {
        await deleteButtons.first().click();
        await page.waitForTimeout(300);

        const modal = page.locator('[data-payments-target="deleteModal"]');
        await expect(modal).toBeVisible();

        await page.locator('[data-payments-target="deleteModal"] button:has-text("Cancel")').click();
        await page.waitForTimeout(300);
      }
    });
  });
}
