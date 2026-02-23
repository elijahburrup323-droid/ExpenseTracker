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
  test.describe(`Quotes — ${acct.email}`, () => {
    test("Sign-in page shows a quote or default text", async ({ page }) => {
      await page.goto(`${BASE}/users/sign_in`);
      await page.waitForLoadState("networkidle");

      // Should show either a quote (italic text) or the default "Sign in to your account"
      const quoteOrDefault = page.locator(".text-center p.italic, .text-center p:has-text('Sign in to your account')");
      await expect(quoteOrDefault.first()).toBeVisible();
    });

    test("Header bar shows daily quote after login", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      // The top header bar should show a quote (italic text)
      const quoteText = page.locator(".sticky p.italic");
      await expect(quoteText).toBeVisible();
      const text = await quoteText.textContent();
      expect(text.length).toBeGreaterThan(5);
    });

    test("Quotes admin page loads for agents", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/quotes`);
      await page.waitForLoadState("networkidle");

      // Page header visible
      await expect(page.locator("h1:has-text('Quotes')")).toBeVisible();

      // Table should show quotes
      const rows = page.locator("tbody tr");
      await expect(rows.first()).toBeVisible();
    });

    test("Admin menu shows Quotes link", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      const quotesLink = page.locator("a:has-text('Quotes')");
      await expect(quotesLink.first()).toBeVisible();
    });
  });
}
