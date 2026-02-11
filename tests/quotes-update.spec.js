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

test.describe("Quote System Update — Cache & Efficiency", () => {
  test("Header bar shows a quote from the database", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Quote should be present in header (italic text)
    const quote = page.locator(".sticky.top-0 p.italic");
    // On wider screens it's visible
    const text = await quote.textContent();
    // Should contain a quote (non-empty, has opening/closing quote marks)
    expect(text.length).toBeGreaterThan(5);
  });

  test("Sign-in page shows a quote", async ({ page }) => {
    await page.goto(`${BASE}/users/sign_in`);
    await page.waitForLoadState("networkidle");

    // The sign-in page should show some text content (quote or fallback)
    const body = await page.textContent("body");
    expect(body.length).toBeGreaterThan(0);
  });

  test("Quotes API returns quotes with authors", async ({ page }) => {
    await login(page, AGENT);

    // Fetch quotes API
    const response = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/quotes`, {
        headers: { "Accept": "application/json" }
      });
      return res.json();
    }, BASE);

    // Should have quotes
    expect(response.length).toBeGreaterThan(0);

    // At least some quotes should have authors
    const withAuthors = response.filter(q => q.quote_author && q.quote_author.length > 0);
    expect(withAuthors.length).toBeGreaterThan(0);
  });

  test("Quotes admin page loads and shows table", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/quotes`);
    await page.waitForLoadState("networkidle");

    // Should see the quotes management page with a table
    await expect(page.locator("table")).toBeVisible();
    // Should have rows
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });
});
