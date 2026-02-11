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
  test.describe(`Dashboard Header — ${acct.email}`, () => {
    test("Open month displayed under Hello greeting", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      const header = page.locator(".sticky.top-0");
      const monthText = header.locator("p").filter({ hasText: /\w+,\s+\d{4}/ });
      await expect(monthText).toBeVisible();
    });

    test("Hello greeting visible", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h1:has-text('Hello')")).toBeVisible();
    });

    test("Quote visible and does not overflow header", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      const quote = page.locator(".sticky.top-0 p.italic");
      const isVisible = await quote.isVisible();
      if (isVisible) {
        const quoteBox = await quote.boundingBox();
        const headerBox = await page.locator(".sticky.top-0").boundingBox();
        expect(quoteBox.x + quoteBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 5);
      }
    });
  });
}
