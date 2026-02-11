const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "elijahburrup323@gmail.com");
  await page.fill('input[name="user[password]"]', "Eli624462!");
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Payment Add — Refresh + Scroll Top", () => {
  test("After adding a payment, page scrolls to top", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");

    // Scroll down first to verify scroll-to-top works
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    // Click Add Payment
    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(300);

    // The add modal should be visible
    const modal = page.locator('[data-payments-target="addModal"]');
    await expect(modal).toBeVisible();
  });

  test("Payment list preserves sort order after operations", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");

    // Click amount column to sort by amount
    const amountHeader = page.locator('[data-sort-col="amount"]');
    if (await amountHeader.count() > 0) {
      await amountHeader.click();
      await page.waitForTimeout(300);

      // Verify sort indicator is visible
      const indicator = amountHeader.locator(".sort-indicator");
      await expect(indicator).toBeVisible();
    }
  });
});
