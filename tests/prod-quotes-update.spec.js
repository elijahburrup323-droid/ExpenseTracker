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

    test("Quotes API returns quotes with authors", async ({ page }) => {
      await login(page, acct);

      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/quotes`, {
          headers: { "Accept": "application/json" }
        });
        return res.json();
      }, BASE);

      expect(response.length).toBeGreaterThan(0);
      const withAuthors = response.filter(q => q.quote_author && q.quote_author.length > 0);
      expect(withAuthors.length).toBeGreaterThan(0);
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
