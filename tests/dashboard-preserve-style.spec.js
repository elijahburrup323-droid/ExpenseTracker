const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@example.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe("CM6: Dashboard Preserve Style", () => {
  test("Card containers use original styling classes", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // All 6 cards should use the original card styling
    const cards = page.locator(".grid > div");
    const count = await cards.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const cls = await card.getAttribute("class");
      expect(cls).toContain("bg-white");
      expect(cls).toContain("rounded-xl");
      expect(cls).toContain("shadow-sm");
      expect(cls).toContain("border");
      expect(cls).toContain("p-6");
    }
  });

  test("Card 1: No 'Month to date', has month/year and View Details link", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const card1 = page.locator(".grid > div").first();
    // No "Month to date"
    await expect(card1).not.toContainText("Month to date");
    // Has month/year label
    const monthLabel = card1.locator('[data-dashboard-target="monthLabel"]');
    await expect(monthLabel).toBeVisible();
    // Has View Details link (restored from original)
    await expect(card1).toContainText("View Details");
    // Has donut chart with original purple color
    const donutCircle = card1.locator('circle[stroke="#a855f7"]');
    await expect(donutCircle).toHaveCount(1);
  });

  test("Card 2: Has 'Total:' and original account icons", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const card2 = page.locator(".grid > div").nth(1);
    await expect(card2).toContainText("Total:");
    await expect(card2).toContainText("Accounts");
    // Has Manage Accounts link
    await expect(card2).toContainText("Manage Accounts");
  });

  test("Card 3: Net Worth chart uses original purple gradient", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const card3 = page.locator(".grid > div").nth(2);
    await expect(card3).toContainText("Net Worth");
    // Purple gradient and line color preserved
    const purpleLine = card3.locator('polyline[stroke="#a855f7"]');
    const purpleDots = card3.locator('circle[fill="#a855f7"]');
    // At least the gradient stop should exist
    const gradientStop = card3.locator('stop[stop-color="#a855f7"]');
    expect(await gradientStop.count()).toBeGreaterThan(0);
  });

  test("Card 4: Has month arrows and original icons for Income & Spending", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const card4 = page.locator(".grid > div").nth(3);
    await expect(card4).toContainText("Income & Spending");
    // Month label with arrows
    const monthLabel = card4.locator('[data-dashboard-target="monthLabel"]');
    await expect(monthLabel).toBeVisible();
    // Original content items preserved
    await expect(card4).toContainText("Beginning Balance");
    await expect(card4).toContainText("Income");
    await expect(card4).toContainText("Expenses");
    await expect(card4).toContainText("Current Balance");
    // Footer links preserved
    await expect(card4).toContainText("Manage Payments");
    await expect(card4).toContainText("Manage Deposits");
  });

  test("Card 5: Has month arrows and original activity icons", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const card5 = page.locator(".grid > div").nth(4);
    await expect(card5).toContainText("Recent Activity");
    // Month label
    const monthLabel = card5.locator('[data-dashboard-target="monthLabel"]');
    await expect(monthLabel).toBeVisible();
    // View All link preserved
    await expect(card5).toContainText("View All");
  });

  test("Card 6: Buckets card unchanged", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const card6 = page.locator(".grid > div").nth(5);
    await expect(card6).toContainText("Buckets");
    await expect(card6).toContainText("No buckets yet");
    await expect(card6).toContainText("Manage Buckets");
  });

  test("Grid layout is 3 columns on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const grid = page.locator(".grid.grid-cols-1.md\\:grid-cols-3");
    await expect(grid).toBeVisible();
    const display = await grid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe("grid");
  });

  test("Month navigation preserves card styling after re-render", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate to previous month
    const card1 = page.locator(".grid > div").first();
    await card1.locator('button[data-action="click->dashboard#prevMonth"]').click();
    await page.waitForTimeout(2000);

    // Card 1 should still have donut chart with purple
    const donutCircle = card1.locator('circle[stroke="#a855f7"]');
    await expect(donutCircle).toHaveCount(1);

    // Card 1 should still have View Details link
    await expect(card1).toContainText("View Details");

    // Card 4 should still have original line items
    const card4 = page.locator(".grid > div").nth(3);
    await expect(card4).toContainText("Beginning Balance");
    await expect(card4).toContainText("Income");
    await expect(card4).toContainText("Expenses");
    await expect(card4).toContainText("Current Balance");
  });
});
