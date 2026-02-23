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
  test.describe(`Open Month Master — ${acct.email}`, () => {
    test("Dashboard loads with month navigation and persists month", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      // Month labels visible
      const monthLabel = page.locator("[data-dashboard-target='monthLabel']").first();
      await expect(monthLabel).toBeVisible();
      const initialText = await monthLabel.textContent();
      expect(initialText).toMatch(/\w+ \d{4}/);

      // Navigate to previous month
      const prevBtn = page.locator("[data-action='click->dashboard#prevMonth']").first();
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes("/api/open_month_master") && resp.request().method() === "PUT" && resp.status() === 200),
        page.waitForResponse(resp => resp.url().includes("/api/dashboard/card_data")),
        prevBtn.click(),
      ]);

      const newText = await monthLabel.textContent();
      expect(newText).not.toBe(initialText);

      // Reload — should persist
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState("networkidle");
      const persistedText = await page.locator("[data-dashboard-target='monthLabel']").first().textContent();
      expect(persistedText).toBe(newText);

      // Navigate back to current month
      const nextBtn = page.locator("[data-action='click->dashboard#nextMonth']").first();
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes("/api/open_month_master") && resp.request().method() === "PUT" && resp.status() === 200),
        nextBtn.click(),
      ]);
    });
  });
}
