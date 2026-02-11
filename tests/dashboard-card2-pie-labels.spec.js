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

test.describe("Card 2 Pie Chart Labels", () => {
  test("Pie chart legend shows name, balance, and percentage", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Click pie icon to flip card
    await page.locator('button[aria-label="View pie chart"]').click();
    await page.waitForTimeout(700);

    // Check legend entries contain the pattern: Name — $X.XX — X%
    const legendItems = page.locator('[data-dashboard-target="card2Flipper"] .mt-2 span.truncate');
    const count = await legendItems.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const text = await legendItems.nth(i).textContent();
      // Should contain two em-dashes separating name, balance, and percentage
      expect(text).toMatch(/\S+.*—.*\$[\d,.]+.*—.*\d+%/);
    }
  });

  test("Pie chart legend does not modify card dimensions", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const cardBefore = await page.locator('button[aria-label="View pie chart"]').locator("xpath=ancestor::div[contains(@class,'rounded-xl')]").boundingBox();

    await page.locator('button[aria-label="View pie chart"]').click();
    await page.waitForTimeout(700);

    const cardAfter = await page.locator('button[aria-label="View pie chart"]').locator("xpath=ancestor::div[contains(@class,'rounded-xl')]").boundingBox();

    // Card dimensions should not change
    expect(Math.abs(cardAfter.width - cardBefore.width)).toBeLessThan(2);
    expect(Math.abs(cardAfter.height - cardBefore.height)).toBeLessThan(2);
  });
});
