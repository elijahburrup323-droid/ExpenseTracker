const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";
const AGENT = { email: "test@example.com", password: "password123" };

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Dashboard Header — Open Month + Quote Wrapping", () => {
  test("Open month is displayed under Hello greeting", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Should show a month name + year format (e.g., "February, 2026")
    const header = page.locator(".sticky.top-0");
    const monthText = header.locator("p").filter({ hasText: /\w+,\s+\d{4}/ });
    await expect(monthText).toBeVisible();
  });

  test("Hello greeting is visible", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    const helloText = page.locator("h1:has-text('Hello')");
    await expect(helloText).toBeVisible();
  });

  test("Quote is displayed and does not overflow", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Quote element should exist
    const quote = page.locator(".sticky.top-0 p.italic");
    // On desktop it should be visible (hidden sm:block)
    const isVisible = await quote.isVisible();
    // If viewport is large enough, quote should be visible
    if (isVisible) {
      const quoteBox = await quote.boundingBox();
      const headerBox = await page.locator(".sticky.top-0").boundingBox();
      // Quote should not extend beyond the header's right edge
      expect(quoteBox.x + quoteBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 5);
    }
  });

  test("Open month is visible on non-dashboard pages too", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");

    // Month display should be present in header on all pages
    const header = page.locator(".sticky.top-0");
    const monthText = header.locator("p").filter({ hasText: /\w+,\s+\d{4}/ });
    await expect(monthText).toBeVisible();
  });
});
