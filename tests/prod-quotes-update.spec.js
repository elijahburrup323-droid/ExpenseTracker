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
  test.describe(`Quote System Update — ${acct.email}`, () => {
    test("Header shows a quote from the database", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      const quote = page.locator(".sticky.top-0 p.italic");
      const text = await quote.textContent();
      expect(text.length).toBeGreaterThan(5);
    });

    test("Quotes admin page has Author column in table", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/quotes`);
      await page.waitForLoadState("networkidle");

      // Table should be visible with Author column header
      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("th:has-text('Author')")).toBeVisible();
      await expect(page.locator("th:has-text('Active')")).toBeVisible();

      // Add Quote button should be visible
      await expect(page.locator("button:has-text('Add Quote')")).toBeVisible();
    });

    test("Quotes admin page loads", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/quotes`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("tbody tr").first()).toBeVisible();
    });
  });
}
